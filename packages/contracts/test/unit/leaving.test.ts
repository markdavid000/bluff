import { expect } from "chai";
import { deployGameFixture } from "../fixtures";
import { falseBid, settle, trueBid } from "../helpers/round";
import { startFreeGame } from "../helpers/tables";

const PLAYING = 3n;
const FINISHED = 5n;
const OTHERS_LEFT = 2n;

describe("leaving a game", function () {
  it("forfeits, passes the turn and frees the player", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob, carol]);
    await expect(bluff.connect(alice).leaveTable(id))
      .to.emit(bluff, "PlayerLeft")
      .withArgs(id, alice.address, false)
      .and.to.emit(bluff, "TurnPassed")
      .withArgs(id, 1, (deadline: bigint) => deadline > 0n);
    const [table, seats] = await bluff.getTable(id);
    expect(table.status).to.equal(PLAYING);
    expect(table.turn).to.equal(1n);
    expect(seats[0].isActive).to.equal(false);
    expect(await bluff.tableOf(alice.address)).to.equal(0n);
    await expect(bluff.connect(alice).createFreeTable(2, false)).to.emit(bluff, "TableCreated");
  });

  it("keeps a leaver's seat at their next table when the old game ends", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const first = await startFreeGame(bluff, [alice, bob, carol]);
    await (await bluff.connect(alice).leaveTable(first)).wait();
    await (await bluff.connect(alice).createFreeTable(2, false)).wait();
    const next = await bluff.tableOf(alice.address);
    await (await bluff.connect(bob).leaveTable(first)).wait();
    expect((await bluff.getTable(first))[0].status).to.equal(FINISHED);
    expect(await bluff.tableOf(alice.address)).to.equal(next);
    expect(await bluff.tableOf(carol.address)).to.equal(0n);
    await expect(bluff.connect(alice).createFreeTable(2, false))
      .to.be.revertedWithCustomError(bluff, "AlreadyAtTable")
      .withArgs(next);
    await expect(bluff.connect(alice).leaveTable(next)).to.emit(bluff, "PlayerLeft");
  });

  it("does not move the turn when someone else is playing", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob, carol]);
    await expect(bluff.connect(carol).leaveTable(id)).not.to.emit(bluff, "TurnPassed");
    await bluff.connect(alice).placeBid(id, 1, 2);
    await bluff.connect(bob).placeBid(id, 1, 3);
    expect((await bluff.getTable(id))[0].turn).to.equal(0n);
  });

  it("ends the game at once when only one player is left", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    await expect(bluff.connect(bob).leaveTable(id))
      .to.emit(bluff, "GameEnded")
      .withArgs(id, OTHERS_LEFT, [alice.address]);
    expect((await bluff.getTable(id))[0].status).to.equal(FINISHED);
    expect(await bluff.tableOf(alice.address)).to.equal(0n);
  });

  it("still counts the dice of a player who leaves during a reveal", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const players = [alice, bob, carol];
    const id = await startFreeGame(bluff, players);
    const bid = await trueBid(bluff, id, players);
    await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
    await bluff.connect(bob).callBluff(id);
    const handles = await bluff.revealHandles(id);
    await bluff.connect(carol).leaveTable(id);
    expect(await bluff.revealHandles(id)).to.deep.equal(handles);
    await expect(settle(bluff, id, alice))
      .to.emit(bluff, "RoundSettled")
      .withArgs(
        id,
        1n,
        bid.face,
        bid.quantity,
        bid.quantity,
        bob.address,
        (faces: bigint[]) => faces.length === 9
      );
  });

  it("takes nothing more from a player who left and then loses the call", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const players = [alice, bob, carol];
    const id = await startFreeGame(bluff, players);
    const bid = await falseBid(bluff, id, players);
    await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
    await bluff.connect(bob).callBluff(id);
    await bluff.connect(alice).leaveTable(id);
    await expect(settle(bluff, id, bob))
      .to.emit(bluff, "RoundStarted")
      .withArgs(id, 2n, 1, (deadline: bigint) => deadline > 0n)
      .and.not.to.emit(bluff, "PlayerEliminated");
    const [, seats] = await bluff.getTable(id);
    expect(seats[0].dice).to.equal(3n);
    expect(await bluff.diceOf(id, bob.address)).to.have.length(3);
  });

  it("ends a reveal at once if leaving leaves one player", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    await bluff.connect(alice).placeBid(id, 1, 2);
    await bluff.connect(bob).callBluff(id);
    await expect(bluff.connect(alice).leaveTable(id))
      .to.emit(bluff, "GameEnded")
      .withArgs(id, OTHERS_LEFT, [bob.address]);
    await expect(settle(bluff, id, bob)).to.be.revertedWithCustomError(bluff, "WrongStatus");
  });

  it("lets an eliminated player leave without changing the game", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const players = [alice, bob, carol];
    const id = await startFreeGame(bluff, players);
    for (let loss = 1; loss <= 3; loss++) {
      const bid = await falseBid(bluff, id, players);
      await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
      await bluff.connect(bob).callBluff(id);
      await settle(bluff, id, bob);
    }
    const [before] = await bluff.getTable(id);
    await expect(bluff.connect(alice).leaveTable(id))
      .to.emit(bluff, "PlayerLeft")
      .and.not.to.emit(bluff, "TurnPassed");
    const [after] = await bluff.getTable(id);
    expect(after.turn).to.equal(before.turn);
    expect(after.status).to.equal(PLAYING);
    expect(await bluff.tableOf(alice.address)).to.equal(0n);
  });

  it("refuses to let a player leave twice", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob, carol]);
    await bluff.connect(alice).leaveTable(id);
    await expect(bluff.connect(alice).leaveTable(id))
      .to.be.revertedWithCustomError(bluff, "NotAtTable")
      .withArgs(id);
  });
});
