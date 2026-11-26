import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployGameFixture } from "../fixtures";
import { CHIP, chipBalance, claimChips, payToCreate, payToJoin } from "../helpers/chips";
import { nextTableId } from "../helpers/table-ids";

const PLAYING = 3n;
const BUY_IN = 10n * CHIP;
const LOBBY_LIMIT = 10 * 60;

describe("removing a guest who isn't ready", function () {
  it("lets the host remove a guest who isn't ready, freeing the seat and listing the table again", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await nextTableId(bluff, alice);
    await bluff.connect(alice).createFreeTable(2, false);
    await bluff.connect(bob).joinFreeTable(id);
    await expect(bluff.connect(alice).removeUnready(id, bob.address))
      .to.emit(bluff, "PlayerRemoved")
      .withArgs(id, bob.address)
      .and.to.emit(bluff, "TableListed")
      .withArgs(id);
    const [table, seats] = await bluff.getTable(id);
    expect(table.playerCount).to.equal(1n);
    expect(seats.map((seat) => seat.player)).to.deep.equal([alice.address]);
    expect(await bluff.tableOf(bob.address)).to.equal(0n);
  });

  it("refunds a removed guest's buy-in", async function () {
    const { alice, bob, chips, bluff, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await claimChips(faucet, bob);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    const id = await bluff.tableOf(alice.address);
    await payToJoin(chips, cashier, bob, id, BUY_IN);
    await expect(bluff.connect(alice).removeUnready(id, bob.address)).to.emit(cashier, "Refunded");
    expect(await chipBalance(chips, bob)).to.equal(100n * CHIP);
  });

  it("stops a guest with no chips from sitting back down at the paid table they were removed from", async function () {
    const { alice, carol, chips, bluff, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    const id = await bluff.tableOf(alice.address);
    await payToJoin(chips, cashier, carol, id, BUY_IN);
    await bluff.connect(alice).removeUnready(id, carol.address);
    await expect(payToJoin(chips, cashier, carol, id, BUY_IN)).to.be.revertedWithCustomError(
      bluff,
      "RemovedFromTable"
    );
    expect(await bluff.tableOf(carol.address)).to.equal(0n);
  });

  it("stops a removed guest from rejoining that free table, but not others", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await nextTableId(bluff, alice);
    await bluff.connect(alice).createFreeTable(3, false);
    await bluff.connect(bob).joinFreeTable(id);
    await bluff.connect(alice).removeUnready(id, bob.address);
    await expect(bluff.connect(bob).joinFreeTable(id))
      .to.be.revertedWithCustomError(bluff, "RemovedFromTable")
      .withArgs(id);
    const other = await nextTableId(bluff, carol);
    await bluff.connect(carol).createFreeTable(3, false);
    await expect(bluff.connect(bob).joinFreeTable(other)).to.emit(bluff, "PlayerJoined");
  });

  it("refuses anyone but the host", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await nextTableId(bluff, alice);
    await bluff.connect(alice).createFreeTable(3, false);
    await bluff.connect(bob).joinFreeTable(id);
    await bluff.connect(carol).joinFreeTable(id);
    await expect(bluff.connect(carol).removeUnready(id, bob.address))
      .to.be.revertedWithCustomError(bluff, "NotHost")
      .withArgs(id);
  });

  it("never removes a guest who is ready", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await nextTableId(bluff, alice);
    await bluff.connect(alice).createFreeTable(3, false);
    await bluff.connect(bob).joinFreeTable(id);
    await bluff.connect(bob).setReady(id, true);
    await expect(bluff.connect(alice).removeUnready(id, bob.address))
      .to.be.revertedWithCustomError(bluff, "PlayerIsReady")
      .withArgs(id, bob.address);
  });

  it("never removes the host", async function () {
    const { alice, bluff } = await deployGameFixture();
    const id = await nextTableId(bluff, alice);
    await bluff.connect(alice).createFreeTable(3, false);
    await expect(bluff.connect(alice).removeUnready(id, alice.address))
      .to.be.revertedWithCustomError(bluff, "CannotRemoveHost")
      .withArgs(id);
  });

  it("refuses someone who isn't at the table", async function () {
    const { alice, carol, bluff } = await deployGameFixture();
    const id = await nextTableId(bluff, alice);
    await bluff.connect(alice).createFreeTable(3, false);
    await expect(bluff.connect(alice).removeUnready(id, carol.address))
      .to.be.revertedWithCustomError(bluff, "NotAtTable")
      .withArgs(id);
  });

  it("only works before the game starts", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await nextTableId(bluff, alice);
    await bluff.connect(alice).createFreeTable(3, false);
    await bluff.connect(bob).joinFreeTable(id);
    await bluff.connect(carol).joinFreeTable(id);
    await bluff.connect(bob).setReady(id, true);
    await bluff.connect(carol).setReady(id, true);
    await bluff.connect(alice).startTable(id);
    await expect(bluff.connect(alice).removeUnready(id, bob.address))
      .to.be.revertedWithCustomError(bluff, "WrongStatus")
      .withArgs(id, PLAYING);
  });
});

describe("closing an expired table", function () {
  it("lets anyone close a waiting table once its time is up, refunding everyone", async function () {
    const { alice, bob, carol, chips, bluff, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await claimChips(faucet, bob);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    const id = await bluff.tableOf(alice.address);
    await payToJoin(chips, cashier, bob, id, BUY_IN);
    await time.increase(LOBBY_LIMIT + 1);
    await expect(bluff.connect(carol).cancelTable(id))
      .to.emit(bluff, "TableCancelled")
      .withArgs(id);
    expect(await chipBalance(chips, alice)).to.equal(100n * CHIP);
    expect(await chipBalance(chips, bob)).to.equal(100n * CHIP);
    expect(await bluff.openTableCount()).to.equal(0n);
  });

  it("still makes everyone wait for the time to be up", async function () {
    const { alice, carol, bluff } = await deployGameFixture();
    const id = await nextTableId(bluff, alice);
    await bluff.connect(alice).createFreeTable(3, false);
    const [table] = await bluff.getTable(id);
    await expect(bluff.connect(carol).cancelTable(id))
      .to.be.revertedWithCustomError(bluff, "DeadlineNotPassed")
      .withArgs(table.deadline);
  });
});
