import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployGameFixture } from "../fixtures";

const WAITING = 1n;
const PLAYING = 3n;
const CANCELLED = 6n;
const LOBBY_LIMIT = 10 * 60;

describe("waiting room", function () {
  describe("leaving", function () {
    it("frees the seat and the player", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(1);
      await bluff.connect(carol).joinFreeTable(1);
      await expect(bluff.connect(bob).leaveTable(1))
        .to.emit(bluff, "PlayerLeft")
        .withArgs(1n, bob.address, false);
      const [table, seats] = await bluff.getTable(1);
      expect(table.playerCount).to.equal(2n);
      expect(seats.map((seat) => seat.player)).to.deep.equal([alice.address, carol.address]);
      expect(await bluff.tableOf(bob.address)).to.equal(0n);
    });

    it("lets a player who left join another table", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).joinFreeTable(1);
      await bluff.connect(bob).leaveTable(1);
      await bluff.connect(carol).createFreeTable(3, false);
      await expect(bluff.connect(bob).joinFreeTable(2)).to.emit(bluff, "PlayerJoined");
    });

    it("passes the host role to the next player to have joined", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(1);
      await bluff.connect(carol).joinFreeTable(1);
      await expect(bluff.connect(alice).leaveTable(1))
        .to.emit(bluff, "HostChanged")
        .withArgs(1n, bob.address);
      expect((await bluff.getTable(1))[0].host).to.equal(bob.address);
    });

    it("closes the table when the last player leaves", async function () {
      const { alice, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await expect(bluff.connect(alice).leaveTable(1))
        .to.emit(bluff, "TableCancelled")
        .withArgs(1n)
        .and.to.emit(bluff, "TableUnlisted")
        .withArgs(1n);
      expect((await bluff.getTable(1))[0].status).to.equal(CANCELLED);
      expect(await bluff.openTableCount()).to.equal(0n);
      expect(await bluff.tableOf(alice.address)).to.equal(0n);
    });

    it("refuses a player who is not at the table", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await expect(bluff.connect(bob).leaveTable(1))
        .to.be.revertedWithCustomError(bluff, "NotAtTable")
        .withArgs(1n);
    });

    it("refuses an unknown table", async function () {
      const { alice, bluff } = await deployGameFixture();
      await expect(bluff.connect(alice).leaveTable(4))
        .to.be.revertedWithCustomError(bluff, "TableNotFound")
        .withArgs(4n);
    });
  });

  describe("cancelling", function () {
    it("waits for the lobby limit to pass", async function () {
      const { alice, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      const [table] = await bluff.getTable(1);
      await expect(bluff.connect(alice).cancelTable(1))
        .to.be.revertedWithCustomError(bluff, "DeadlineNotPassed")
        .withArgs(table.deadline);
    });

    it("lets any seated player cancel after 10 minutes and frees everyone", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).joinFreeTable(1);
      await time.increase(LOBBY_LIMIT + 1);
      await expect(bluff.connect(bob).cancelTable(1)).to.emit(bluff, "TableCancelled").withArgs(1n);
      expect((await bluff.getTable(1))[0].status).to.equal(CANCELLED);
      expect(await bluff.tableOf(alice.address)).to.equal(0n);
      expect(await bluff.tableOf(bob.address)).to.equal(0n);
      expect(await bluff.openTableCount()).to.equal(0n);
    });

    it("refuses players who are not seated", async function () {
      const { alice, carol, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await time.increase(LOBBY_LIMIT + 1);
      await expect(bluff.connect(carol).cancelTable(1))
        .to.be.revertedWithCustomError(bluff, "NotAtTable")
        .withArgs(1n);
    });

    it("refuses to cancel a game in progress", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).joinFreeTable(1);
      await time.increase(LOBBY_LIMIT + 1);
      await expect(bluff.connect(alice).cancelTable(1))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(1n, PLAYING);
    });

    it("still lets the host start after the limit with two or more players", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(1);
      await time.increase(LOBBY_LIMIT + 1);
      await bluff.connect(alice).startTable(1);
      expect((await bluff.getTable(1))[0].status).to.equal(PLAYING);
    });

    it("keeps a waiting table waiting until someone acts", async function () {
      const { alice, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await time.increase(LOBBY_LIMIT + 1);
      expect((await bluff.getTable(1))[0].status).to.equal(WAITING);
    });
  });
});
