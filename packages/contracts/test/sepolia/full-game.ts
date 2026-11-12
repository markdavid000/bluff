import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import type { ContractTransactionResponse } from "ethers";
import { ethers, fhevm } from "hardhat";
import { readDeployment } from "../../tasks/deployments";
import type { Bluff, BluffCashier, ChipFaucet, MockConfidentialUSDT } from "../../types";
import { CHIP, CREATE, JOIN, joinData, payAndCall } from "../helpers/chips";

const BUY_IN = 10n * CHIP;
const PLAYER_GAS = ethers.parseEther("0.02");
const RETRIES = 15;
const RETRY_DELAY_MS = 2_000;
const PLAYING = 3n;
const VERIFYING = 2n;
const FINISHED = 5n;
const timings: { step: string; seconds: number }[] = [];
let lastBlock = 0;

function atLastBlock() {
  return { blockTag: lastBlock };
}

async function timed<T>(step: string, action: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await action();
  timings.push({ step, seconds: (Date.now() - start) / 1000 });
  return result;
}

async function withRetry<T>(action: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

async function caughtUp() {
  await withRetry(async () => {
    if ((await ethers.provider.getBlockNumber()) < lastBlock) throw new Error("The node is behind");
  });
}

async function send(action: () => Promise<ContractTransactionResponse>) {
  await caughtUp();
  const receipt = await (await action()).wait();
  if (receipt === null || receipt.status !== 1) throw new Error("The transaction did not succeed");
  lastBlock = Math.max(lastBlock, receipt.blockNumber);
}

async function table(bluff: Bluff, id: bigint) {
  return (await bluff.getTable(id, atLastBlock()))[0];
}

async function revealAndSettle(
  bluff: Bluff,
  id: bigint,
  settler: HardhatEthersSigner,
  verifying: boolean
) {
  const handles = [...(await bluff.revealHandles(id, atLastBlock()))];
  const result = await timed(verifying ? "paid check: public reveal" : "round: public reveal", () =>
    withRetry(() => fhevm.publicDecrypt(handles))
  );
  await timed(verifying ? "paid check: confirm seats" : "round: settle reveal", () =>
    send(() =>
      verifying
        ? bluff
            .connect(settler)
            .confirmSeats(id, result.abiEncodedClearValues, result.decryptionProof)
        : bluff
            .connect(settler)
            .settleReveal(id, result.abiEncodedClearValues, result.decryptionProof)
    )
  );
}

describe("a full game on Sepolia", function () {
  this.timeout(30 * 60 * 1000);
  let host: HardhatEthersSigner;
  let guest: HardhatEthersSigner;
  let bluff: Bluff;
  let cashier: BluffCashier;
  let faucet: ChipFaucet;
  let chips: MockConfidentialUSDT;

  before(async function () {
    if (fhevm.isMock) this.skip();
    const record = readDeployment("sepolia");
    [host, guest] = await ethers.getSigners();
    bluff = (await ethers.getContractAt("Bluff", record.contracts.Bluff.proxy)) as unknown as Bluff;
    cashier = (await ethers.getContractAt(
      "BluffCashier",
      record.contracts.BluffCashier.proxy
    )) as unknown as BluffCashier;
    faucet = (await ethers.getContractAt(
      "ChipFaucet",
      record.contracts.ChipFaucet.proxy
    )) as unknown as ChipFaucet;
    chips = (await ethers.getContractAt(
      "MockConfidentialUSDT",
      record.chips
    )) as unknown as MockConfidentialUSDT;
    lastBlock = await ethers.provider.getBlockNumber();
    if ((await ethers.provider.getBalance(guest.address)) < PLAYER_GAS) {
      await host.sendTransaction({ to: guest.address, value: PLAYER_GAS }).then((tx) => tx.wait());
    }
  });

  beforeEach(async function () {
    for (const player of [host, guest]) {
      const id = await bluff.tableOf(player.address, atLastBlock());
      if (id !== 0n) await send(() => bluff.connect(player).leaveTable(id));
    }
  });

  after(function () {
    if (timings.length > 0) console.table(timings);
  });

  it("plays a free round and pays nothing", async function () {
    await timed("free: create table", () =>
      send(() => bluff.connect(host).createFreeTable(2, false))
    );
    const id = await bluff.tableOf(host.address, atLastBlock());
    await timed("free: join", () => send(() => bluff.connect(guest).joinFreeTable(id)));
    await timed("free: guest ready", () => send(() => bluff.connect(guest).setReady(id, true)));
    await timed("free: host starts and rolls", () =>
      send(() => bluff.connect(host).startTable(id))
    );
    expect((await table(bluff, id)).status).to.equal(PLAYING);
    const dice = await bluff.diceOf(id, host.address, atLastBlock());
    const first = await timed("free: peek at own dice", () =>
      withRetry(() => fhevm.userDecryptEuint(FhevmType.euint8, dice[0], String(bluff.target), host))
    );
    expect(first >= 0n && first <= 5n).to.equal(true);
    await timed("free: bid", () => send(() => bluff.connect(host).placeBid(id, 1, 2)));
    await timed("free: call bluff", () => send(() => bluff.connect(guest).callBluff(id)));
    await revealAndSettle(bluff, id, host, false);
    expect((await table(bluff, id)).round).to.equal(2n);
    await timed("free: leave, game ends", () => send(() => bluff.connect(guest).leaveTable(id)));
    expect((await table(bluff, id)).status).to.equal(FINISHED);
  });

  it("plays a paid game with real chips and pays the winner", async function () {
    for (const player of [host, guest]) {
      const now = BigInt(Math.floor(Date.now() / 1000));
      if ((await faucet.nextClaimAt(player.address, atLastBlock())) <= now) {
        await timed("chips: daily claim", () => send(() => faucet.connect(player).claim("")));
      }
    }
    await timed("paid: pay and create", () =>
      send(() => payAndCall(chips, cashier, host, BUY_IN, joinData(CREATE, 0n, 2, BUY_IN, false)))
    );
    const id = await bluff.tableOf(host.address, atLastBlock());
    await timed("paid: pay and join", () =>
      send(() => payAndCall(chips, cashier, guest, BUY_IN, joinData(JOIN, id, 0, 0n, false)))
    );
    await timed("paid: guest ready", () => send(() => bluff.connect(guest).setReady(id, true)));
    await timed("paid: host starts the check", () =>
      send(() => bluff.connect(host).startTable(id))
    );
    expect((await table(bluff, id)).status).to.equal(VERIFYING);
    await revealAndSettle(bluff, id, host, true);
    expect((await table(bluff, id)).status).to.equal(PLAYING);
    await timed("paid: bid", () => send(() => bluff.connect(host).placeBid(id, 1, 2)));
    await timed("paid: call bluff", () => send(() => bluff.connect(guest).callBluff(id)));
    await revealAndSettle(bluff, id, guest, false);
    await timed("paid: leave, winner paid", () => send(() => bluff.connect(guest).leaveTable(id)));
    expect((await table(bluff, id)).status).to.equal(FINISHED);
  });
});
