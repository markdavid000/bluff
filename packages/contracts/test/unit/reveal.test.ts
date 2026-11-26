import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { fhevm } from "hardhat";
import { deployGameFixture } from "../fixtures";
import {
  countMatching,
  falseBid,
  playerOnTurn,
  settle,
  tableValues,
  trueBid,
} from "../helpers/round";
import { startFreeGame } from "../helpers/tables";
import { kmsVerifier } from "../helpers/kms";

const PLAYING = 3n;
const REVEALING = 4n;
const FINISHED = 5n;
const STUCK_REVEAL_LIMIT = 10n * 60n;
const LAST_PLAYER_STANDING = 0n;

describe("calling and revealing", function () {
  describe("calling a bluff", function () {
    it("needs a bid to call", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await expect(bluff.connect(alice).callBluff(id))
        .to.be.revertedWithCustomError(bluff, "NoBidToCall")
        .withArgs(id);
    });

    it("lets only the player on turn call", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob, carol]);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await expect(bluff.connect(carol).callBluff(id))
        .to.be.revertedWithCustomError(bluff, "NotYourTurn")
        .withArgs(id, 1);
    });

    it("moves to revealing with a 10 minute limit", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await expect(bluff.connect(bob).callBluff(id))
        .to.emit(bluff, "BluffCalled")
        .withArgs(id, 1n, bob.address, (deadline: bigint) => deadline > 0n);
      const [table] = await bluff.getTable(id);
      expect(table.status).to.equal(REVEALING);
      expect(table.caller).to.equal(1n);
      expect(table.deadline - BigInt(await time.latest())).to.equal(STUCK_REVEAL_LIMIT);
    });

    it("makes dice public only once a bluff is called", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      const handles = await bluff.diceOf(id, alice.address);
      let error: unknown;
      try {
        await fhevm.publicDecrypt([handles[0]]);
      } catch (caught) {
        error = caught;
      }
      expect(error).to.be.instanceOf(Error);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      const revealed = await fhevm.publicDecrypt([...(await bluff.revealHandles(id))]);
      expect(Object.keys(revealed.clearValues)).to.have.length(8);
    });

    it("refuses bids once a bluff is called", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      await expect(bluff.connect(alice).placeBid(id, 2, 2))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, REVEALING);
    });

    it("lists reveal handles only while revealing", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await expect(bluff.revealHandles(id))
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, PLAYING);
    });
  });

  describe("settling", function () {
    it("takes a die from the caller when the bid was true", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const players = [alice, bob];
      const id = await startFreeGame(bluff, players);
      const values = await tableValues(bluff, id, players);
      const bid = await trueBid(bluff, id, players);
      await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
      await bluff.connect(bob).callBluff(id);
      await expect(settle(bluff, id, carol))
        .to.emit(bluff, "RoundSettled")
        .withArgs(
          id,
          1n,
          bid.face,
          bid.quantity,
          countMatching(values, bid.face),
          bob.address,
          (faces: bigint[]) => faces.length === 8
        );
      const [table, seats] = await bluff.getTable(id);
      expect(seats[0].dice).to.equal(4n);
      expect(seats[1].dice).to.equal(3n);
      expect(table.status).to.equal(PLAYING);
    });

    it("takes a die from the bidder when the bid was a bluff", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const players = [alice, bob];
      const id = await startFreeGame(bluff, players);
      const bid = await falseBid(bluff, id, players);
      await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
      await bluff.connect(bob).callBluff(id);
      await expect(settle(bluff, id, bob))
        .to.emit(bluff, "RoundSettled")
        .withArgs(
          id,
          1n,
          bid.face,
          bid.quantity,
          bid.quantity - 1,
          alice.address,
          (faces: bigint[]) => faces.length === 8
        );
      const [, seats] = await bluff.getTable(id);
      expect(seats[0].dice).to.equal(3n);
      expect(seats[1].dice).to.equal(4n);
    });

    it("counts ones as wild and reports every revealed face", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const players = [alice, bob];
      const id = await startFreeGame(bluff, players);
      const values = await tableValues(bluff, id, players);
      const ones = values.filter((value) => value === 0n).length;
      await bluff.connect(alice).placeBid(id, 1, 6);
      await bluff.connect(bob).callBluff(id);
      const receipt = await (await settle(bluff, id, bob)).wait();
      const event = receipt?.logs
        .map((log) => bluff.interface.parseLog(log))
        .find((parsed) => parsed?.name === "RoundSettled");
      const faces = (event?.args.revealedFaces as bigint[]).map(Number).sort();
      expect(faces).to.deep.equal(values.map((value) => Number(value) + 1).sort());
      const sixes = values.filter((value) => value === 5n).length;
      expect(event?.args.count).to.equal(BigInt(sixes + ones));
    });

    it("rejects a forged reveal", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      const handles = await bluff.revealHandles(id);
      const result = await fhevm.publicDecrypt([...handles]);
      const forged =
        result.abiEncodedClearValues.slice(0, -2) +
        (result.abiEncodedClearValues.endsWith("05") ? "04" : "05");
      await expect(
        bluff.connect(bob).settleReveal(id, forged, result.decryptionProof)
      ).to.be.revertedWithCustomError(await kmsVerifier(), "KMSInvalidSigner");
    });

    it("accepts a reveal only once", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      const handles = await bluff.revealHandles(id);
      const result = await fhevm.publicDecrypt([...handles]);
      await bluff
        .connect(bob)
        .settleReveal(id, result.abiEncodedClearValues, result.decryptionProof);
      await expect(
        bluff.connect(bob).settleReveal(id, result.abiEncodedClearValues, result.decryptionProof)
      )
        .to.be.revertedWithCustomError(bluff, "WrongStatus")
        .withArgs(id, PLAYING);
    });

    it("refuses an old reveal in a later round", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const players = [alice, bob];
      const id = await startFreeGame(bluff, players);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      const old = await fhevm.publicDecrypt([...(await bluff.revealHandles(id))]);
      await bluff.connect(bob).settleReveal(id, old.abiEncodedClearValues, old.decryptionProof);
      const starter = await playerOnTurn(bluff, id, players);
      const other = starter === alice ? bob : alice;
      await bluff.connect(starter).placeBid(id, 1, 2);
      await bluff.connect(other).callBluff(id);
      await expect(
        bluff.connect(bob).settleReveal(id, old.abiEncodedClearValues, old.decryptionProof)
      ).to.be.reverted;
    });
  });

  describe("the next round", function () {
    it("rolls fresh dice and lets the loser start", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const players = [alice, bob];
      const id = await startFreeGame(bluff, players);
      const before = await bluff.diceOf(id, bob.address);
      const bid = await falseBid(bluff, id, players);
      await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
      await bluff.connect(bob).callBluff(id);
      await expect(settle(bluff, id, bob))
        .to.emit(bluff, "RoundStarted")
        .withArgs(id, 2n, 0, (deadline: bigint) => deadline > 0n);
      const [table] = await bluff.getTable(id);
      expect(table.round).to.equal(2n);
      expect(table.turn).to.equal(0n);
      expect(table.bidQuantity).to.equal(0n);
      expect(table.diceInPlay).to.equal(7n);
      expect(await bluff.diceOf(id, alice.address)).to.have.length(3);
      expect(await bluff.diceOf(id, bob.address)).not.to.deep.equal(before);
    });
  });

  describe("elimination and the end of the game", function () {
    it("ends the game when only one player has dice left", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      const players = [alice, bob];
      const id = await startFreeGame(bluff, players);
      for (let round = 1; round <= 3; round++) {
        const bid = await falseBid(bluff, id, players);
        await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
        await bluff.connect(bob).callBluff(id);
        await settle(bluff, id, bob);
      }
      const bid = await falseBid(bluff, id, players);
      await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
      await bluff.connect(bob).callBluff(id);
      await expect(settle(bluff, id, bob))
        .to.emit(bluff, "PlayerEliminated")
        .withArgs(id, alice.address)
        .and.to.emit(bluff, "GameEnded")
        .withArgs(id, LAST_PLAYER_STANDING, [bob.address]);
      const [table, seats] = await bluff.getTable(id);
      expect(table.status).to.equal(FINISHED);
      expect(seats[0].isActive).to.equal(false);
      expect(await bluff.tableOf(alice.address)).to.equal(0n);
      expect(await bluff.tableOf(bob.address)).to.equal(0n);
      await expect(bluff.connect(alice).createFreeTable(2, false)).to.emit(bluff, "TableCreated");
    });

    it("passes the start to the next player and skips the eliminated one", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const players = [alice, bob, carol];
      const id = await startFreeGame(bluff, players);
      for (let loss = 1; loss <= 3; loss++) {
        const bid = await falseBid(bluff, id, players);
        await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
        await bluff.connect(bob).callBluff(id);
        const settling = settle(bluff, id, bob);
        if (loss === 3) {
          await expect(settling)
            .to.emit(bluff, "PlayerEliminated")
            .withArgs(id, alice.address)
            .and.to.emit(bluff, "RoundStarted")
            .withArgs(id, 4n, 1, (deadline: bigint) => deadline > 0n);
        } else {
          await settling;
        }
      }
      const [table, seats] = await bluff.getTable(id);
      expect(table.diceInPlay).to.equal(6n);
      expect(seats[0].isActive).to.equal(false);
      expect(await bluff.diceOf(id, alice.address)).to.have.length(0);
      await bluff.connect(bob).placeBid(id, 1, 2);
      await bluff.connect(carol).placeBid(id, 1, 3);
      expect((await bluff.getTable(id))[0].turn).to.equal(1n);
    });
  });
});
