import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployGameFixture } from "../fixtures";
import { nextTableId } from "../helpers/table-ids";

const WAITING = 1n;
const PLAYING = 3n;
const CANCELLED = 6n;
const LOBBY_LIMIT = 10 * 60;
const UNKNOWN_TABLE = 2n ** 48n;

describe("waiting room", function () {
  describe("leaving", function () {
    it("frees the seat and the player", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(carol).joinFreeTable(id);
      await expect(bluff.connect(bob).leaveTable(id))
        .to.emit(bluff, "PlayerLeft")
        .withArgs(id, bob.address, false);
      const [table, seats] = await bluff.getTable(id);
      expect(table.playerCount).to.equal(2n);
      expect(seats.map((seat) => seat.player)).to.deep.equal([alice.address, carol.address]);
      expect(await bluff.tableOf(bob.address)).to.equal(0n);
    });

    it("lets a player who left join another table", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).leaveTable(id);
      const other = await nextTableId(bluff, carol);
      await bluff.connect(carol).createFreeTable(3, false);
      await expect(bluff.connect(bob).joinFreeTable(other)).to.emit(bluff, "PlayerJoined");
    });

    it("passes the host role to the next player to have joined", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(carol).joinFreeTable(id);
      await expect(bluff.connect(alice).leaveTable(id))
        .to.emit(bluff, "HostChanged")
        .withArgs(id, bob.address);
      expect((await bluff.getTable(id))[0].host).to.equal(bob.address);
    });

    it("closes the table when the last player leaves", async function () {
      const { alice, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await expect(bluff.connect(alice).leaveTable(id))
        .to.emit(bluff, "TableCancelled")
        .withArgs(id)
        .and.to.emit(bluff, "TableUnlisted")
        .withArgs(id);
      expect((await bluff.getTable(id))[0].status).to.equal(CANCELLED);
      expect(await bluff.openTableCount()).to.equal(0n);
      expect(await bluff.tableOf(alice.address)).to.equal(0n);
    });

    it("refuses a player who is not at the table", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await expect(bluff.connect(bob).leaveTable(id))
        .to.be.revertedWithCustomError(bluff, "NotAtTable")
        .withArgs(id);
    });

    it("refuses an unknown table", async function () {
      const { alice, bluff } = await deployGameFixture();
      await expect(bluff.connect(alice).leaveTable(UNKNOWN_TABLE))
        .to.be.revertedWithCustomError(bluff, "TableNotFound")
        .withArgs(UNKNOWN_TABLE);
    });
  });

  describe("cancelling", function () {
    it("waits for the lobby limit to pass", async function () {
      const { alice, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      const [table] = await bluff.getTable(id);
      await expect(bluff.connect(alice).cancelTable(id))
        .to.be.revertedWithCustomError(bluff, "DeadlineNotPassed")
        .withArgs(table.deadline);
    });

    it("lets any seated player cancel after 10 minutes and frees everyone", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).joinFreeTable(id);
      await time.increase(LOBBY_LIMIT + 1);
      await expect(bluff.connect(bob).cancelTable(id))
        .to.emit(bluff, "TableCancelled")
        .withArgs(id);
      expect((await bluff.getTable(id))[0].status).to.equal(CANCELLED);
      expect(await bluff.tableOf(alice.address)).to.equal(0n);
      expect(await bluff.tableOf(bob.address)).to.equal(0n);
      expect(await bluff.openTableCount()).to.equal(0n);
    });

    it("refuses players who are not seated", async function () {
      const { alice, carol, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await time.increase(LOBBY_LIMIT + 1);
      await expect(bluff.connect(carol).cancelTable(id))
        .to.be.revertedWithCustomError(bluff, "NotAtTable")
        .withArgs(id);
    });

    it("refuses to cancel a game in progress", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await bluff.connect(alice).startTable(id);
      await time.increase(LOBBY_LIMIT + 1);
      await expect(bluff.connect(alice).cancelTable(id))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, PLAYING);
    });

    it("still lets the host start after the limit with two or more players", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await time.increase(LOBBY_LIMIT + 1);
      await bluff.connect(alice).startTable(id);
      expect((await bluff.getTable(id))[0].status).to.equal(PLAYING);
    });

    it("keeps a waiting table waiting until someone acts", async function () {
      const { alice, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await bluff.connect(alice).createFreeTable(3, false);
      await time.increase(LOBBY_LIMIT + 1);
      expect((await bluff.getTable(id))[0].status).to.equal(WAITING);
    });
  });
});
