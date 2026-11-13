import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { deployGameFixture } from "../fixtures";
import {
  CHIP,
  chipBalance,
  claimChips,
  payToCreate,
  payToJoin,
  startPaidGame,
} from "../helpers/chips";
import { falseBid, settle } from "../helpers/round";
import { startFreeGame } from "../helpers/tables";

const BUY_IN = 10n * CHIP;
const LOBBY_LIMIT = 10 * 60;
const STUCK_REVEAL_LIMIT = 10 * 60;

describe("payouts and refunds", function () {
  describe("before the game", function () {
    it("refunds a player who leaves the waiting room", async function () {
      const { alice, bob, chips, bluff, cashier, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await claimChips(faucet, bob);
      await payToCreate(chips, cashier, alice, 3, BUY_IN);
      const id = await bluff.tableOf(alice.address);
      await payToJoin(chips, cashier, bob, id, BUY_IN);
      await expect(bluff.connect(bob).leaveTable(id))
        .to.emit(bluff, "PlayerLeft")
        .withArgs(id, bob.address, true)
        .and.to.emit(cashier, "Refunded");
      expect(await chipBalance(chips, bob)).to.equal(100n * CHIP);
    });

    it("refunds everyone when a waiting table is cancelled", async function () {
      const { alice, bob, chips, bluff, cashier, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await claimChips(faucet, bob);
      await payToCreate(chips, cashier, alice, 3, BUY_IN);
      const id = await bluff.tableOf(alice.address);
      await payToJoin(chips, cashier, bob, id, BUY_IN);
      await time.increase(LOBBY_LIMIT + 1);
      await bluff.connect(alice).cancelTable(id);
      expect(await chipBalance(chips, alice)).to.equal(100n * CHIP);
      expect(await chipBalance(chips, bob)).to.equal(100n * CHIP);
    });
  });

  describe("at the end of a game", function () {
    it("pays the whole pot to the last player standing", async function () {
      const contracts = await deployGameFixture();
      const { alice, bob, bluff, chips, cashier } = contracts;
      const players = [alice, bob];
      const id = await startPaidGame(contracts, players, BUY_IN);
      for (let round = 1; round <= 4; round++) {
        const bid = await falseBid(bluff, id, players);
        await bluff.connect(alice).placeBid(id, bid.quantity, bid.face);
        await bluff.connect(bob).callBluff(id);
        const settling = settle(bluff, id, bob);
        if (round === 4) await expect(settling).to.emit(cashier, "PotPaid");
        else await settling;
      }
      expect(await chipBalance(chips, alice)).to.equal(90n * CHIP);
      expect(await chipBalance(chips, bob)).to.equal(110n * CHIP);
    });

    it("pays the remaining player when the others leave", async function () {
      const contracts = await deployGameFixture();
      const { alice, bob, chips, bluff } = contracts;
      const id = await startPaidGame(contracts, [alice, bob], BUY_IN);
      await bluff.connect(bob).leaveTable(id);
      expect(await chipBalance(chips, alice)).to.equal(110n * CHIP);
      expect(await chipBalance(chips, bob)).to.equal(90n * CHIP);
    });

    it("shares the pot between tied players when the clock runs out", async function () {
      const contracts = await deployGameFixture();
      const { alice, bob, carol, chips, bluff } = contracts;
      const id = await startPaidGame(contracts, [alice, bob, carol], BUY_IN);
      await time.increase(15 * 60);
      await bluff.connect(bob).claimTimeout(id);
      expect(await chipBalance(chips, alice)).to.equal(90n * CHIP);
      expect(await chipBalance(chips, bob)).to.equal(105n * CHIP);
      expect(await chipBalance(chips, carol)).to.equal(105n * CHIP);
    });

    it("gives the remainder of an uneven split to the first player to have joined", async function () {
      const contracts = await deployGameFixture();
      const { owner, alice, bob, carol, chips, bluff } = contracts;
      const id = await startPaidGame(contracts, [alice, bob, carol, owner], BUY_IN);
      await bluff.connect(owner).leaveTable(id);
      await bluff.connect(alice).placeBid(id, 1, 2);
      await bluff.connect(bob).callBluff(id);
      await time.increase(STUCK_REVEAL_LIMIT + 1);
      await bluff.connect(carol).cancelStuckReveal(id);
      const share = (40n * CHIP) / 3n;
      const remainder = (40n * CHIP) % 3n;
      expect(remainder).to.not.equal(0n);
      expect(await chipBalance(chips, alice)).to.equal(90n * CHIP + share + remainder);
      expect(await chipBalance(chips, bob)).to.equal(90n * CHIP + share);
      expect(await chipBalance(chips, carol)).to.equal(90n * CHIP + share);
      expect(await chipBalance(chips, owner)).to.equal(90n * CHIP);
    });

    it("never moves chips at a free table", async function () {
      const { alice, bob, bluff, cashier } = await deployGameFixture();
      const id = await startFreeGame(bluff, [alice, bob]);
      await expect(bluff.connect(bob).leaveTable(id)).not.to.emit(cashier, "PotPaid");
    });

    it("lets each winner read only their own winnings", async function () {
      const contracts = await deployGameFixture();
      const { alice, bob, carol, bluff, cashier } = contracts;
      const id = await startPaidGame(contracts, [alice, bob], BUY_IN);
      const receipt = await (await bluff.connect(bob).leaveTable(id)).wait();
      const paid = receipt?.logs
        .map((log) => {
          try {
            return cashier.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "PotPaid");
      const handle = paid?.args.amount as string;
      const chipsAddress = await contracts.chips.getAddress();
      expect(await fhevm.userDecryptEuint(FhevmType.euint64, handle, chipsAddress, alice)).to.equal(
        20n * CHIP
      );
      let error: unknown;
      try {
        await fhevm.userDecryptEuint(FhevmType.euint64, handle, chipsAddress, carol);
      } catch (caught) {
        error = caught;
      }
      expect(error).to.be.instanceOf(Error);
      expect(ethers.isHexString(handle)).to.equal(true);
    });
  });
});
