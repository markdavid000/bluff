import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployRulesFixture } from "../fixtures";

const CHIP = 1_000_000n;

describe("rules", function () {
  describe("table rules", function () {
    it("accepts 2 to 4 seats only", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      for (const seats of [0, 1, 5, 255]) {
        expect(await rules.isValidSeatCount(seats)).to.equal(false);
      }
      for (const seats of [2, 3, 4]) {
        expect(await rules.isValidSeatCount(seats)).to.equal(true);
      }
    });

    it("deals 4, 3 and 2 dice for 2, 3 and 4 seats", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      expect(await rules.dicePerPlayer(2)).to.equal(4);
      expect(await rules.dicePerPlayer(3)).to.equal(3);
      expect(await rules.dicePerPlayer(4)).to.equal(2);
    });

    it("accepts the free, 10, 25 and 50 chip buy-ins only", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      for (const buyIn of [0n, 10n * CHIP, 25n * CHIP, 50n * CHIP]) {
        expect(await rules.isValidBuyIn(buyIn)).to.equal(true);
      }
      for (const buyIn of [1n, 10n, 5n * CHIP, 100n * CHIP]) {
        expect(await rules.isValidBuyIn(buyIn)).to.equal(false);
      }
    });
  });

  describe("bid rules", function () {
    it("allows bids on faces 2 to 6 only", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      for (const face of [0, 1, 7]) {
        expect(await rules.isValidFace(face)).to.equal(false);
      }
      for (const face of [2, 3, 4, 5, 6]) {
        expect(await rules.isValidFace(face)).to.equal(true);
      }
    });

    it("allows quantities from 1 to the dice in play", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      expect(await rules.isValidQuantity(0, 8)).to.equal(false);
      expect(await rules.isValidQuantity(1, 8)).to.equal(true);
      expect(await rules.isValidQuantity(8, 8)).to.equal(true);
      expect(await rules.isValidQuantity(9, 8)).to.equal(false);
    });

    it("accepts any first bid", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      expect(await rules.isHigher(1, 2, 0, 0)).to.equal(true);
    });

    it("needs a higher quantity, or the same quantity with a higher face", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      expect(await rules.isHigher(4, 2, 3, 5)).to.equal(true);
      expect(await rules.isHigher(3, 6, 3, 5)).to.equal(true);
      expect(await rules.isHigher(3, 5, 3, 5)).to.equal(false);
      expect(await rules.isHigher(3, 4, 3, 5)).to.equal(false);
      expect(await rules.isHigher(2, 6, 3, 5)).to.equal(false);
    });

    it("recognises the highest possible bid", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      expect(await rules.isMaximal(8, 6, 8)).to.equal(true);
      expect(await rules.isMaximal(8, 5, 8)).to.equal(false);
      expect(await rules.isMaximal(7, 6, 8)).to.equal(false);
    });

    it("maps stored die values 0 to 5 onto faces 1 to 6", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      for (let value = 0; value < 6; value++) {
        expect(await rules.faceOf(value)).to.equal(value + 1);
      }
    });

    it("counts dice showing the bid face and treats ones as wild", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      const values = [0, 4, 4, 2, 5, 0, 1];
      expect(await rules.countMatching(values, 5)).to.equal(4);
      expect(await rules.countMatching(values, 6)).to.equal(3);
      expect(await rules.countMatching(values, 4)).to.equal(2);
      expect(await rules.countMatching([], 4)).to.equal(0);
    });
  });

  describe("nickname rules", function () {
    it("accepts letters, digits, single spaces, underscores and dashes", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      for (const name of ["Brave Otter", "abc", "player_01", "x-y-z", "A".repeat(20)]) {
        expect(await rules.isValidNickname(name)).to.equal(true);
      }
    });

    it("rejects names that are too short, too long or padded with spaces", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      for (const name of ["", "ab", "A".repeat(21), " abc", "abc ", "a  b"]) {
        expect(await rules.isValidNickname(name)).to.equal(false);
      }
    });

    it("rejects markup, look-alike and hidden characters", async function () {
      const { rules } = await loadFixture(deployRulesFixture);
      for (const name of ["<b>hi</b>", "ab.c", "Plаyer", "ab​c", "tab\tname"]) {
        expect(await rules.isValidNickname(name)).to.equal(false);
      }
    });
  });
});
