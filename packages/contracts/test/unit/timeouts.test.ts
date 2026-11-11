import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployGameFixture } from "../fixtures";
import { falseBid, settle } from "../helpers/round";
import { startFreeGame } from "../helpers/tables";

const TURN_LIMIT = 45;
const STUCK_REVEAL_LIMIT = 10 * 60;
const GAME_CLOCK = 15 * 60;
const REVEALING = 4n;
const FINISHED = 5n;
const LAST_PLAYER_STANDING = 0n;
const CLOCK_EXPIRED = 1n;
const STUCK_REVEAL = 3n;

describe("timeouts and the clock", function () {
  describe("turn timeouts", function () {
    it("waits for the 45 second limit", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      const [table] = await bluff.getTable(id);
      await expect(bluff.connect(carol).claimTimeout(id))
        .to.be.revertedWithCustomError(bluff, "DeadlineNotPassed")
        .withArgs(table.deadline);
    });

    it("lets anyone claim it: the idle player loses a die and the next player starts", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob, carol]);
      await time.increase(TURN_LIMIT + 1);
      const outsider = (await ethers.getSigners())[5];
      await expect(bluff.connect(outsider).claimTimeout(id))
        .to.emit(bluff, "TurnTimedOut")
        .withArgs(id, alice.address, 1)
        .and.to.emit(bluff, "RoundStarted")
        .withArgs(id, 2n, 1, (deadline: bigint) => deadline > 0n);
      const [table, seats] = await bluff.getTable(id);
      expect(seats[0].dice).to.equal(2n);
      expect(seats[0].missedTurns).to.equal(1n);
      expect(table.turn).to.equal(1n);
    });

    it("removes a player on their second missed turn", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob, carol]);
      await time.increase(TURN_LIMIT + 1);
      await bluff.connect(bob).claimTimeout(id);
      await bluff.connect(bob).placeBid(id, 1, 2);
      await bluff.connect(carol).placeBid(id, 1, 3);
      await time.increase(TURN_LIMIT + 1);
      await expect(bluff.connect(bob).claimTimeout(id))
        .to.emit(bluff, "TurnTimedOut")
        .withArgs(id, alice.address, 2)
        .and.to.emit(bluff, "PlayerEliminated")
        .withArgs(id, alice.address)
        .and.to.emit(bluff, "RoundStarted")
        .withArgs(id, 3n, 1, (deadline: bigint) => deadline > 0n);
      const [, seats] = await bluff.getTable(id);
      expect(seats[0].isActive).to.equal(false);
      expect(seats[0].dice).to.equal(0n);
      expect(await bluff.tableOf(alice.address)).to.equal(0n);
    });

    it("ends the game when a removal leaves one player", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await time.increase(TURN_LIMIT + 1);
      await bluff.connect(bob).claimTimeout(id);
      await bluff.connect(bob).placeBid(id, 1, 2);
      await time.increase(TURN_LIMIT + 1);
      await expect(bluff.connect(bob).claimTimeout(id))
        .to.emit(bluff, "GameEnded")
        .withArgs(id, LAST_PLAYER_STANDING, [bob.address]);
      expect((await bluff.getTable(id))[0].status).to.equal(FINISHED);
    });

    it("eliminates a player whose timeout costs their last die", async function () {
      const { owner, alice, bob, carol, bluff } = await deployGameFixture();
      const players = [alice, bob, carol, owner];
      const id = await startFreeGame(bluff, players);
      const bid = await falseBid(bluff, id, players);
      await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
      await bluff.connect(bob).callBluff(id);
      await settle(bluff, id, bob);
      expect((await bluff.getTable(id))[1][0].dice).to.equal(1n);
      await time.increase(TURN_LIMIT + 1);
      await expect(bluff.connect(bob).claimTimeout(id))
        .to.emit(bluff, "PlayerEliminated")
        .withArgs(id, alice.address);
      expect((await bluff.getTable(id))[1][0].isActive).to.equal(false);
    });

    it("cannot be claimed while dice are being revealed", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      await time.increase(TURN_LIMIT + 1);
      await expect(bluff.connect(bob).claimTimeout(id))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, REVEALING);
    });
  });

  describe("the game clock", function () {
    it("makes the round in progress the last, and the most dice wins with ties sharing", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob, carol]);
      await time.increase(GAME_CLOCK);
      await expect(bluff.connect(bob).claimTimeout(id))
        .to.emit(bluff, "GameEnded")
        .withArgs(id, CLOCK_EXPIRED, [bob.address, carol.address]);
      expect((await bluff.getTable(id))[0].status).to.equal(FINISHED);
      for (const player of [alice, bob, carol]) {
        expect(await bluff.tableOf(player.address)).to.equal(0n);
      }
    });

    it("names a single winner when one player has the most dice", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const players = [alice, bob];
      const id = await startFreeGame(bluff, players);
      const bid = await falseBid(bluff, id, players);
      await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
      await bluff.connect(bob).callBluff(id);
      await time.increase(GAME_CLOCK);
      await expect(settle(bluff, id, bob))
        .to.emit(bluff, "GameEnded")
        .withArgs(id, CLOCK_EXPIRED, [bob.address]);
    });

    it("keeps playing before the clock runs out", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await time.increase(GAME_CLOCK - 120);
      await expect(bluff.connect(bob).claimTimeout(id)).to.emit(bluff, "RoundStarted");
    });
  });

  describe("stuck reveals", function () {
    it("waits 10 minutes after the call", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      const [table] = await bluff.getTable(id);
      await expect(bluff.connect(bob).cancelStuckReveal(id))
        .to.be.revertedWithCustomError(bluff, "DeadlineNotPassed")
        .withArgs(table.deadline);
    });

    it("then ends the game, shared by everyone still in it", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob, carol]);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      await time.increase(STUCK_REVEAL_LIMIT + 1);
      await expect(bluff.connect(carol).cancelStuckReveal(id))
        .to.emit(bluff, "GameEnded")
        .withArgs(id, STUCK_REVEAL, [alice.address, bob.address, carol.address]);
      expect((await bluff.getTable(id))[0].status).to.equal(FINISHED);
      expect(await bluff.tableOf(alice.address)).to.equal(0n);
    });

    it("cannot be used while a round is being played", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await expect(bluff.connect(bob).cancelStuckReveal(id))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, 3n);
    });
  });
});
