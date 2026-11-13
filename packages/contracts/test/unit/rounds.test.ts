import { expect } from "chai";
import { ethers } from "hardhat";
import { decryptDice } from "../helpers/dice";
import { startFreeGame } from "../helpers/tables";
import { deployGameFixture } from "../fixtures";

const TURN_LIMIT = 45n;

describe("rounds", function () {
  it("starts round 1 with the host on turn and a 45 second deadline", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    await bluff.connect(alice).createFreeTable(2, false);
    const id = await bluff.tableOf(alice.address);
    await bluff.connect(bob).joinFreeTable(id);
    await bluff.connect(bob).setReady(id, true);
    await expect(bluff.connect(alice).startTable(id)).to.emit(bluff, "RoundStarted");
    const [table] = await bluff.getTable(id);
    expect(table.round).to.equal(1n);
    expect(table.roundStarter).to.equal(0n);
    expect(table.turn).to.equal(0n);
    expect(table.bidQuantity).to.equal(0n);
    expect(table.deadline - table.startedAt).to.equal(TURN_LIMIT);
  });

  for (const [players, perPlayer] of [
    [2, 4],
    [3, 3],
    [4, 2],
  ] as const) {
    it(`deals ${perPlayer} hidden dice to each of ${players} players`, async function () {
      const { owner, alice, bob, carol, bluff } = await deployGameFixture();
      const seated = [alice, bob, carol, owner].slice(0, players);
      const id = await startFreeGame(bluff, seated);
      const [table, seats] = await bluff.getTable(id);
      expect(table.diceInPlay).to.equal(BigInt(players * perPlayer));
      for (const [index, player] of seated.entries()) {
        expect(seats[index].dice).to.equal(BigInt(perPlayer));
        const dice = await decryptDice(bluff, id, player);
        expect(dice).to.have.length(perPlayer);
        for (const value of dice) {
          expect(value >= 0n && value <= 5n).to.equal(true);
        }
      }
    });
  }

  it("rolls values across every face over many games", async function () {
    const { bluff } = await deployGameFixture();
    const signers = (await ethers.getSigners()).slice(4, 20);
    const seen = new Set<bigint>();
    for (let pair = 0; pair < signers.length; pair += 2) {
      const players = [signers[pair], signers[pair + 1]];
      const id = await startFreeGame(bluff, players);
      for (const player of players) {
        for (const value of await decryptDice(bluff, id, player)) seen.add(value);
      }
    }
    expect([...seen].sort()).to.deep.equal([0n, 1n, 2n, 3n, 4n, 5n]);
  });

  it("never lets another player read your dice", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    let error: unknown;
    try {
      await decryptDice(bluff, id, alice, bob);
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(Error);
    error = undefined;
    try {
      await decryptDice(bluff, id, alice, carol);
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(Error);
  });

  it("refuses to show dice for someone who is not at the table", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    await expect(bluff.diceOf(id, carol.address))
      .to.be.revertedWithCustomError(bluff, "NotAtTable")
      .withArgs(id);
  });
});
