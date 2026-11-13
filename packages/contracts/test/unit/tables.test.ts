import { expect } from "chai";
import { deployGameFixture } from "../fixtures";
import { proveCode } from "../helpers/invites";
import { nextTableId } from "../helpers/table-ids";

const WAITING = 1n;
const PLAYING = 3n;
const LOBBY_LIMIT = 10n * 60n;
const GAME_CLOCK = 15n * 60n;
const NO_TABLE = 2n ** 48n;

describe("tables", function () {
  describe("creating", function () {
    it("creates a waiting table with the creator in seat 0 as host", async function () {
      const { alice, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await expect(bluff.connect(alice).createFreeTable(3, false))
        .to.emit(bluff, "TableCreated")
        .withArgs(id, alice.address, 3, 3, 0n, false)
        .and.to.emit(bluff, "PlayerJoined")
        .withArgs(id, alice.address, 0);
      const [table, seats] = await bluff.getTable(id);
      expect(table.id).to.equal(id);
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
      expect(await bluff.tableOf(alice.address)).to.equal(id);
    });

    it("deals dice per player from the seat count", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).createFreeTable(3, false);
      await bluff.connect(carol).createFreeTable(4, false);
      const first = await bluff.tableOf(alice.address);
      const second = await bluff.tableOf(bob.address);
      const third = await bluff.tableOf(carol.address);
      expect((await bluff.getTable(first))[0].dicePerPlayer).to.equal(4n);
      expect((await bluff.getTable(second))[0].dicePerPlayer).to.equal(3n);
      expect((await bluff.getTable(third))[0].dicePerPlayer).to.equal(2n);
    });

    it("refuses seat counts outside 2 to 4", async function () {
      const { alice, bluff } = await deployGameFixture();
      for (const seats of [0, 1, 5]) {
        await expect(bluff.connect(alice).createFreeTable(seats, false))
          .to.be.revertedWithCustomError(bluff, "InvalidSeatCount")
          .withArgs(seats);
      }
    });

    it("refuses a player who is already at a table", async function () {
      const { alice, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(2, false);
      const id = await bluff.tableOf(alice.address);
      await expect(bluff.connect(alice).createFreeTable(2, false))
        .to.be.revertedWithCustomError(bluff, "AlreadyAtTable")
        .withArgs(id);
    });
  });

  describe("joining", function () {
    it("takes the next seat", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      const id = await bluff.tableOf(alice.address);
      await expect(bluff.connect(bob).joinFreeTable(id))
        .to.emit(bluff, "PlayerJoined")
        .withArgs(id, bob.address, 1);
      const [table, seats] = await bluff.getTable(id);
      expect(table.playerCount).to.equal(2n);
      expect(seats[1].player).to.equal(bob.address);
      expect(await bluff.tableOf(bob.address)).to.equal(id);
    });

    it("starts the table when the host starts it", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(2, false);
      const id = await bluff.tableOf(alice.address);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await expect(bluff.connect(alice).startTable(id)).to.emit(bluff, "GameStarted");
      const [table] = await bluff.getTable(id);
      expect(table.status).to.equal(PLAYING);
      expect(table.startedAt).to.be.greaterThan(0n);
      expect(await bluff.openTableCount()).to.equal(0n);
    });

    it("reports the game clock when a game starts", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(2, false);
      const id = await bluff.tableOf(alice.address);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      const receipt = await (await bluff.connect(alice).startTable(id)).wait();
      const event = receipt?.logs
        .map((log) => bluff.interface.parseLog(log))
        .find((parsed) => parsed?.name === "GameStarted");
      expect(event?.args.clockEndsAt - event?.args.startedAt).to.equal(GAME_CLOCK);
    });

    it("refuses an unknown table", async function () {
      const { bob, bluff } = await deployGameFixture();
      await expect(bluff.connect(bob).joinFreeTable(NO_TABLE))
        .to.be.revertedWithCustomError(bluff, "TableNotFound")
        .withArgs(NO_TABLE);
    });

    it("refuses a full table that is still waiting for its start", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(2, false);
      const id = await bluff.tableOf(alice.address);
      await bluff.connect(bob).joinFreeTable(id);
      await expect(bluff.connect(carol).joinFreeTable(id))
        .to.be.revertedWithCustomError(bluff, "TableFull")
        .withArgs(id);
      expect((await bluff.getTable(id))[0].playerCount).to.equal(2n);
    });

    it("refuses a table that has already started", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      const id = await bluff.tableOf(alice.address);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await bluff.connect(alice).startTable(id);
      await expect(bluff.connect(carol).joinFreeTable(id))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, PLAYING);
    });

    it("refuses a player who is already at a table", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).createFreeTable(3, false);
      const first = await bluff.tableOf(alice.address);
      const second = await bluff.tableOf(bob.address);
      await expect(bluff.connect(bob).joinFreeTable(first))
        .to.be.revertedWithCustomError(bluff, "AlreadyAtTable")
        .withArgs(second);
      await expect(bluff.connect(alice).joinFreeTable(first))
        .to.be.revertedWithCustomError(bluff, "AlreadyAtTable")
        .withArgs(first);
    });
  });

  describe("starting by the host", function () {
    it("lets the host start with two or more players", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(4, false);
      const id = await bluff.tableOf(alice.address);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await expect(bluff.connect(alice).startTable(id)).to.emit(bluff, "GameStarted");
      expect((await bluff.getTable(id))[0].status).to.equal(PLAYING);
    });

    it("refuses anyone but the host", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(4, false);
      const id = await bluff.tableOf(alice.address);
      await bluff.connect(bob).joinFreeTable(id);
      await expect(bluff.connect(bob).startTable(id))
        .to.be.revertedWithCustomError(bluff, "NotHost")
        .withArgs(id);
    });

    it("refuses to start with one player", async function () {
      const { alice, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(4, false);
      const id = await bluff.tableOf(alice.address);
      await expect(bluff.connect(alice).startTable(id))
        .to.be.revertedWithCustomError(bluff, "NotEnoughPlayers")
        .withArgs(id);
    });

    it("refuses to start a table twice", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(4, false);
      const id = await bluff.tableOf(alice.address);
      await bluff.connect(bob).joinFreeTable(id);
      await bluff.connect(bob).setReady(id, true);
      await bluff.connect(alice).startTable(id);
      await expect(bluff.connect(alice).startTable(id))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, PLAYING);
    });
  });

  describe("the open tables list", function () {
    it("lists public waiting tables only, with pagination", async function () {
      const { owner, alice, bob, carol, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(2, false);
      await bluff.connect(bob).createFreeTable(3, true);
      await bluff.connect(carol).createFreeTable(4, false);
      await bluff.connect(owner).createFreeTable(2, false);
      const first = await bluff.tableOf(alice.address);
      const third = await bluff.tableOf(carol.address);
      const fourth = await bluff.tableOf(owner.address);
      expect(await bluff.openTableCount()).to.equal(3n);
      const all = await bluff.openTables(0, 10);
      expect(all.map((table) => table.id)).to.deep.equal([first, third, fourth]);
      const page = await bluff.openTables(1, 1);
      expect(page.map((table) => table.id)).to.deep.equal([third]);
      expect(await bluff.openTables(5, 10)).to.have.length(0);
    });

    it("announces a public table joining and leaving the list", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await nextTableId(bluff, alice);
      await expect(bluff.connect(alice).createFreeTable(2, false))
        .to.emit(bluff, "TableListed")
        .withArgs(id);
      expect(await bluff.openTableCount()).to.equal(1n);
      await expect(bluff.connect(bob).joinFreeTable(id))
        .to.emit(bluff, "TableUnlisted")
        .withArgs(id);
      expect(await bluff.openTableCount()).to.equal(0n);
    });

    it("never lists or unlists a private table", async function () {
      const { alice, bob, bluff, invites } = await deployGameFixture();
      await expect(bluff.connect(alice).createFreeTable(2, true)).not.to.emit(bluff, "TableListed");
      const id = await bluff.tableOf(alice.address);
      await proveCode(invites, id, alice, bob);
      await expect(bluff.connect(bob).joinFreeTable(id)).not.to.emit(bluff, "TableUnlisted");
    });
  });

  describe("views", function () {
    it("refuses to describe an unknown table", async function () {
      const { bluff } = await deployGameFixture();
      await expect(bluff.getTable(NO_TABLE))
        .to.be.revertedWithCustomError(bluff, "TableNotFound")
        .withArgs(NO_TABLE);
    });
  });
});
