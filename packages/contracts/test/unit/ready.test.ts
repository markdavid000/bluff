import { expect } from "chai";
import { deployGameFixture } from "../fixtures";
import { proveCode } from "../helpers/invites";
import { CHIP, chipBalance, claimChips, payToCreate, payToJoin } from "../helpers/chips";
import { nextTableId } from "../helpers/table-ids";

const WAITING = 1n;
const VERIFYING = 2n;
const PLAYING = 3n;
const BUY_IN = 10n * CHIP;
const UNKNOWN_TABLE = 2n ** 48n;

describe("ready marks and host start", function () {
  describe("a full table waits", function () {
    it("does not start a free table when its last seat fills", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, false);
      await expect(bluff.connect(bob).joinFreeTable(id)).not.to.emit(bluff, "GameStarted");
      expect((await bluff.getTable(id))[0].status).to.equal(WAITING);
    });

    it("does not start the payment check when a paid table's last seat is paid for", async function () {
      const { alice, bob, chips, cashier, bluff, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await claimChips(faucet, bob);
      const id = await nextTableId(bluff, alice);
      await payToCreate(chips, cashier, alice, 2, BUY_IN);
      await expect(payToJoin(chips, cashier, bob, id, BUY_IN)).not.to.emit(
        bluff,
        "SeatVerificationStarted"
      );
      expect((await bluff.getTable(id))[0].status).to.equal(WAITING);
    });

    it("leaves the open list while full and comes back when a seat frees up", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, false);
      await expect(bluff.connect(bob).joinFreeTable(id))
        .to.emit(bluff, "TableUnlisted")
        .withArgs(id);
      expect(await bluff.openTableCount()).to.equal(0n);
      await expect(bluff.connect(bob).leaveTable(id)).to.emit(bluff, "TableListed").withArgs(id);
      expect(await bluff.openTableCount()).to.equal(1n);
    });

    it("never lists a private table, even when a seat frees up", async function () {
      const { alice, bob, bluff, invites } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, true);
      await proveCode(invites, id, alice, bob);
      await bluff.connect(bob).joinFreeTable(id);
      await expect(bluff.connect(bob).leaveTable(id)).not.to.emit(bluff, "TableListed");
      expect(await bluff.openTableCount()).to.equal(0n);
    });
  });

  describe("marking ready", function () {
    it("toggles a seated player's mark, tells everyone, and shows it on the seat", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).joinFreeTable(id);
      expect((await bluff.getTable(id))[1].map((seat) => seat.ready)).to.deep.equal([false, false]);
      await expect(bluff.connect(bob).setReady(id, true))
        .to.emit(bluff, "PlayerReady")
        .withArgs(id, bob.address, true);
      expect((await bluff.getTable(id))[1].map((seat) => seat.ready)).to.deep.equal([false, true]);
      await expect(bluff.connect(bob).setReady(id, false))
        .to.emit(bluff, "PlayerReady")
        .withArgs(id, bob.address, false);
      expect((await bluff.getTable(id))[1].map((seat) => seat.ready)).to.deep.equal([false, false]);
    });

    it("refuses a player who is not at the table", async function () {
      const { alice, carol, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, false);
      await expect(bluff.connect(carol).setReady(id, true))
        .to.be.revertedWithCustomError(bluff, "NotAtTable")
        .withArgs(id);
    });

    it("refuses an unknown table", async function () {
      const { alice, bluff } = await deployGameFixture();
      await expect(bluff.connect(alice).setReady(UNKNOWN_TABLE, true))
        .to.be.revertedWithCustomError(bluff, "TableNotFound")
        .withArgs(UNKNOWN_TABLE);
    });

    it("refuses once the game has started", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await bluff.connect(alice).startTable(id);
      await expect(bluff.connect(bob).setReady(id, false))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, PLAYING);
    });

    it("still works while new tables are paused", async function () {
      const { owner, alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(owner).pause();
      await expect(bluff.connect(bob).setReady(id, true)).to.emit(bluff, "PlayerReady");
    });

    it("clears a leaver's mark, so they come back not ready", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await bluff.connect(bob).leaveTable(id);
      await bluff.connect(bob).joinFreeTable(id);
      expect((await bluff.getTable(id))[1].map((seat) => seat.ready)).to.deep.equal([false, false]);
      await expect(bluff.connect(alice).startTable(id))
        .to.be.revertedWithCustomError(bluff, "NotEveryoneReady")
        .withArgs(id);
    });
  });

  describe("the host starts", function () {
    it("waits until every other player is ready, without needing the host's own mark", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(carol).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await expect(bluff.connect(alice).startTable(id))
        .to.be.revertedWithCustomError(bluff, "NotEveryoneReady")
        .withArgs(id);
      await bluff.connect(carol).setReady(id, true);
      await expect(bluff.connect(alice).startTable(id)).to.emit(bluff, "GameStarted");
      expect((await bluff.getTable(id))[0].status).to.equal(PLAYING);
    });

    it("starts the payment check of a paid table once everyone is ready", async function () {
      const { alice, bob, chips, cashier, bluff, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await claimChips(faucet, bob);
      const id = await nextTableId(bluff, alice);
      await payToCreate(chips, cashier, alice, 2, BUY_IN);
      await payToJoin(chips, cashier, bob, id, BUY_IN);
      await bluff.connect(bob).setReady(id, true);
      await expect(bluff.connect(alice).startTable(id)).to.emit(bluff, "SeatVerificationStarted");
      expect((await bluff.getTable(id))[0].status).to.equal(VERIFYING);
    });

    it("can still start a table that is not full, once everyone seated is ready", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await expect(bluff.connect(alice).startTable(id)).to.emit(bluff, "GameStarted");
    });

    it("refuses anyone but the host, even when everyone is ready", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await expect(bluff.connect(bob).startTable(id))
        .to.be.revertedWithCustomError(bluff, "NotHost")
        .withArgs(id);
    });
  });

  describe("leaving before the start never moves anyone else", function () {
    it("keeps the other player seated at a full free table", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).joinFreeTable(id);
      await expect(bluff.connect(alice).leaveTable(id)).not.to.emit(bluff, "GameEnded");
      const [table, seats] = await bluff.getTable(id);
      expect(table.status).to.equal(WAITING);
      expect(table.host).to.equal(bob.address);
      expect(seats.map((seat) => seat.player)).to.deep.equal([bob.address]);
      expect(await bluff.tableOf(bob.address)).to.equal(id);
      expect(await bluff.tableOf(alice.address)).to.equal(0n);
    });

    it("refunds the leaver of a full paid table and keeps the other player seated", async function () {
      const { alice, bob, chips, cashier, bluff, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await claimChips(faucet, bob);
      const id = await nextTableId(bluff, alice);
      await payToCreate(chips, cashier, alice, 2, BUY_IN);
      await payToJoin(chips, cashier, bob, id, BUY_IN);
      await expect(bluff.connect(bob).leaveTable(id))
        .to.emit(bluff, "PlayerLeft")
        .withArgs(id, bob.address, true);
      expect(await chipBalance(chips, bob)).to.equal(100n * CHIP);
      expect(await bluff.tableOf(alice.address)).to.equal(id);
      expect((await bluff.getTable(id))[0].status).to.equal(WAITING);
    });
  });

  it("no longer offers a way to start a table except the host's", async function () {
    const { bluff } = await deployGameFixture();
    expect(bluff.interface.hasFunction("startIfFull")).to.equal(false);
  });
});
