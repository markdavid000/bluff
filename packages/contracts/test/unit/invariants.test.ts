import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { Bluff } from "../../types";
import { deployGameFixture } from "../fixtures";
import { CHIP, chipBalance, startPaidGame } from "../helpers/chips";
import { settle } from "../helpers/round";
import { startFreeGame } from "../helpers/tables";

const TURN_LIMIT = 75;

const PLAYING = 3n;
const REVEALING = 4n;
const FINISHED = 5n;
const MAX_STEPS = 150;
const BUY_IN = 10n * CHIP;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextBid(
  random: () => number,
  quantity: number,
  face: number,
  diceInPlay: number
): { quantity: number; face: number } | null {
  if (quantity === 0) {
    return {
      quantity: 1 + Math.floor(random() * Math.min(3, diceInPlay)),
      face: 2 + Math.floor(random() * 5),
    };
  }
  const canRaiseFace = face < 6;
  const canRaiseQuantity = quantity < diceInPlay;
  if (canRaiseFace && (!canRaiseQuantity || random() < 0.5)) {
    return { quantity, face: face + 1 + Math.floor(random() * (6 - face)) };
  }
  if (canRaiseQuantity) return { quantity: quantity + 1, face: 2 + Math.floor(random() * 5) };
  return null;
}

async function checkInvariants(bluff: Bluff, id: bigint, roundChanged: boolean) {
  const [table, seats] = await bluff.getTable(id);
  if (table.status === FINISHED) {
    for (const seat of seats) expect(await bluff.tableOf(seat.player)).to.equal(0n);
    return;
  }
  for (const seat of seats) {
    if (seat.isActive) expect(await bluff.tableOf(seat.player)).to.equal(id);
  }
  if (table.status === PLAYING) {
    expect(seats[Number(table.turn)].isActive).to.equal(true);
    if (roundChanged) {
      const activeDice = seats
        .filter((seat) => seat.isActive)
        .reduce((sum, seat) => sum + seat.dice, 0n);
      expect(table.diceInPlay).to.equal(activeDice);
    }
  }
}

async function playRandomGame(seed: number, paid: boolean, playerCount: number) {
  const contracts = await deployGameFixture();
  const { bluff, chips } = contracts;
  const signers = (await ethers.getSigners()).slice(0, playerCount);
  const random = seededRandom(seed);
  const id = paid
    ? await startPaidGame(contracts, signers, BUY_IN)
    : await startFreeGame(bluff, signers);
  const signerOf = (address: string) =>
    signers.find((s) => s.address === address) as HardhatEthersSigner;
  const anyone = () => signers[Math.floor(random() * signers.length)];
  let lastRound = (await bluff.getTable(id))[0].round;

  for (let step = 0; step < MAX_STEPS; step++) {
    const [table, seats] = await bluff.getTable(id);
    if (table.status === FINISHED) break;
    if (table.status === REVEALING) {
      await (await settle(bluff, id, anyone())).wait();
    } else if (table.status === PLAYING) {
      const roll = random();
      const onTurn = signerOf(seats[Number(table.turn)].player);
      if (roll < 0.05) {
        await time.increase(TURN_LIMIT + 1);
        await (await bluff.connect(anyone()).claimTimeout(id)).wait();
      } else if (roll < 0.09) {
        const leavers = seats.filter((seat) => seat.isActive);
        const leaver = signerOf(leavers[Math.floor(random() * leavers.length)].player);
        await (await bluff.connect(leaver).leaveTable(id)).wait();
      } else {
        const bid = nextBid(
          random,
          Number(table.bidQuantity),
          Number(table.bidFace),
          Number(table.diceInPlay)
        );
        const call = table.bidQuantity > 0n && (bid === null || random() < 0.35);
        if (call) {
          await (await bluff.connect(onTurn).callBluff(id)).wait();
        } else if (bid) {
          await (await bluff.connect(onTurn).placeBid(id, bid.quantity, bid.face)).wait();
        }
      }
    }
    const round = (await bluff.getTable(id))[0].round;
    await checkInvariants(bluff, id, round !== lastRound);
    lastRound = round;
  }

  expect((await bluff.getTable(id))[0].status).to.equal(FINISHED);
  if (paid) {
    let total = 0n;
    for (const signer of signers) total += await chipBalance(chips, signer);
    expect(total).to.equal(BigInt(playerCount) * 100n * CHIP);
  }
}

describe("invariants over random games", function () {
  const games: [number, boolean, number][] = [
    [11, false, 2],
    [22, false, 3],
    [33, false, 4],
    [44, true, 2],
    [55, true, 3],
    [66, true, 4],
    [77, true, 4],
    [88, false, 4],
  ];
  for (const [seed, paid, players] of games) {
    it(`seed ${seed}: ${players} players, ${paid ? "paid" : "free"}, ends cleanly`, async function () {
      await playRandomGame(seed, paid, players);
    });
  }
});
