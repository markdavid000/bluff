import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployGameFixture } from "../fixtures";

const WAITING = 1n;
const PLAYING = 3n;
const LOBBY_LIMIT = 10n * 60n;
const GAME_CLOCK = 15n * 60n;

describe("tables", function () {
  describe("creating", function () {
    it("creates a waiting table with the creator in seat 0 as host", async function () {
      const { alice, bluff } = await loadFixture(deployGameFixture);
      await expect(bluff.connect(alice).createFreeTable(3, false))
        .to.emit(bluff, "TableCreated")
        .withArgs(1n, alice.address, 3, 3, 0n, false)
        .and.to.emit(bluff, "PlayerJoined")
        .withArgs(1n, alice.address, 0);
      const [table, seats] = await bluff.getTable(1);
      expect(table.id).to.equal(1n);
      expect(table.host).to.equal(alice.address);
      expect(table.status).to.equal(WAITING);
      expect(table.seatCount).to.equal(3n);
      expect(table.playerCount).to.equal(1n);
      expect(table.dicePerPlayer).to.equal(3n);
      expect(table.buyIn).to.equal(0n);
      expect(table.deadline - table.createdAt).to.equal(LOBBY_LIMIT);
      expect(seats).to.have.length(1);
      expect(seats[0].player).to.equal(alice.address);
      expect(seats[0].isActive).to.equal(true);
      expect(await bluff.tableOf(alice.address)).to.equal(1n);
    });

    it("deals dice per player from the seat count", async function () {
      const { alice, bob, carol, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).createFreeTable(3, false);
      await bluff.connect(carol).createFreeTable(4, false);
      expect((await bluff.getTable(1))[0].dicePerPlayer).to.equal(4n);
      expect((await bluff.getTable(2))[0].dicePerPlayer).to.equal(3n);
      expect((await bluff.getTable(3))[0].dicePerPlayer).to.equal(2n);
    });

    it("numbers tables from 1", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).createFreeTable(2, true);
      expect(await bluff.tableOf(alice.address)).to.equal(1n);
      expect(await bluff.tableOf(bob.address)).to.equal(2n);
    });

    it("refuses seat counts outside 2 to 4", async function () {
      const { alice, bluff } = await loadFixture(deployGameFixture);
      for (const seats of [0, 1, 5]) {
        await expect(bluff.connect(alice).createFreeTable(seats, false))
          .to.be.revertedWithCustomError(bluff, "InvalidSeatCount")
          .withArgs(seats);
      }
    });

    it("refuses a player who is already at a table", async function () {
      const { alice, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(2, false);
      await expect(bluff.connect(alice).createFreeTable(2, false))
        .to.be.revertedWithCustomError(bluff, "AlreadyAtTable")
        .withArgs(1n);
    });
  });

  describe("joining", function () {
    it("takes the next seat", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(3, false);
      await expect(bluff.connect(bob).joinFreeTable(1))
        .to.emit(bluff, "PlayerJoined")
        .withArgs(1n, bob.address, 1);
      const [table, seats] = await bluff.getTable(1);
      expect(table.playerCount).to.equal(2n);
      expect(seats[1].player).to.equal(bob.address);
      expect(await bluff.tableOf(bob.address)).to.equal(1n);
    });

    it("starts the table when the last seat fills", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(2, false);
      const join = bluff.connect(bob).joinFreeTable(1);
      await expect(join).to.emit(bluff, "GameStarted");
      const [table] = await bluff.getTable(1);
      expect(table.status).to.equal(PLAYING);
      expect(table.startedAt).to.be.greaterThan(0n);
      expect(await bluff.openTableCount()).to.equal(0n);
    });

    it("reports the game clock when a game starts", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(2, false);
      const receipt = await (await bluff.connect(bob).joinFreeTable(1)).wait();
      const event = receipt?.logs
        .map((log) => bluff.interface.parseLog(log))
        .find((parsed) => parsed?.name === "GameStarted");
      expect(event?.args.clockEndsAt - event?.args.startedAt).to.equal(GAME_CLOCK);
    });

    it("refuses an unknown table", async function () {
      const { bob, bluff } = await loadFixture(deployGameFixture);
      await expect(bluff.connect(bob).joinFreeTable(9))
        .to.be.revertedWithCustomError(bluff, "TableNotFound")
        .withArgs(9n);
    });

    it("refuses a full table, which has already started", async function () {
      const { alice, bob, carol, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).joinFreeTable(1);
      await expect(bluff.connect(carol).joinFreeTable(1))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(1n, PLAYING);
    });

    it("refuses a player who is already at a table", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).createFreeTable(3, false);
      await expect(bluff.connect(bob).joinFreeTable(1))
        .to.be.revertedWithCustomError(bluff, "AlreadyAtTable")
        .withArgs(2n);
      await expect(bluff.connect(alice).joinFreeTable(1))
        .to.be.revertedWithCustomError(bluff, "AlreadyAtTable")
        .withArgs(1n);
    });
  });

  describe("starting by the host", function () {
    it("lets the host start with two or more players", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(1);
      await expect(bluff.connect(alice).startTable(1)).to.emit(bluff, "GameStarted");
      expect((await bluff.getTable(1))[0].status).to.equal(PLAYING);
    });

    it("refuses anyone but the host", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(1);
      await expect(bluff.connect(bob).startTable(1))
        .to.be.revertedWithCustomError(bluff, "NotHost")
        .withArgs(1n);
    });

    it("refuses to start with one player", async function () {
      const { alice, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(4, false);
      await expect(bluff.connect(alice).startTable(1))
        .to.be.revertedWithCustomError(bluff, "NotEnoughPlayers")
        .withArgs(1n);
    });

    it("refuses to start a table twice", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(4, false);
      await bluff.connect(bob).joinFreeTable(1);
      await bluff.connect(alice).startTable(1);
      await expect(bluff.connect(alice).startTable(1))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(1n, PLAYING);
    });
  });

  describe("the open tables list", function () {
    it("lists public waiting tables only, with pagination", async function () {
      const { owner, alice, bob, carol, bluff } = await loadFixture(deployGameFixture);
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).createFreeTable(3, true);
      await bluff.connect(carol).createFreeTable(4, false);
      await bluff.connect(owner).createFreeTable(2, false);
      expect(await bluff.openTableCount()).to.equal(3n);
      const all = await bluff.openTables(0, 10);
      expect(all.map((table) => table.id)).to.deep.equal([1n, 3n, 4n]);
      const page = await bluff.openTables(1, 1);
      expect(page.map((table) => table.id)).to.deep.equal([3n]);
      expect(await bluff.openTables(5, 10)).to.have.length(0);
    });

    it("announces a public table joining and leaving the list", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await expect(bluff.connect(alice).createFreeTable(2, false))
        .to.emit(bluff, "TableListed")
        .withArgs(1n);
      expect(await bluff.openTableCount()).to.equal(1n);
      await expect(bluff.connect(bob).joinFreeTable(1))
        .to.emit(bluff, "TableUnlisted")
        .withArgs(1n);
      expect(await bluff.openTableCount()).to.equal(0n);
    });

    it("never lists or unlists a private table", async function () {
      const { alice, bob, bluff } = await loadFixture(deployGameFixture);
      await expect(bluff.connect(alice).createFreeTable(2, true)).not.to.emit(bluff, "TableListed");
      await expect(bluff.connect(bob).joinFreeTable(1)).not.to.emit(bluff, "TableUnlisted");
    });
  });

  describe("views", function () {
    it("refuses to describe an unknown table", async function () {
      const { bluff } = await loadFixture(deployGameFixture);
      await expect(bluff.getTable(1))
        .to.be.revertedWithCustomError(bluff, "TableNotFound")
        .withArgs(1n);
    });
  });
});
