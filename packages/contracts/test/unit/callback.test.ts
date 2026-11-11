import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ZeroHash } from "ethers";
import { fhevm } from "hardhat";
import { deployGameFixture } from "../fixtures";
import {
  CHIP,
  CREATE,
  JOIN,
  chipBalance,
  claimChips,
  joinData,
  payAndCall,
  payToCreate,
  payToJoin,
} from "../helpers/chips";

const WAITING = 1n;
const BUY_IN = 10n * CHIP;

describe("pay and join", function () {
  it("creates a paid table and keeps exactly the buy-in", async function () {
    const { alice, chips, bluff, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await expect(payToCreate(chips, cashier, alice, 3, BUY_IN))
      .to.emit(bluff, "TableCreated")
      .withArgs(1n, alice.address, 3, 3, BUY_IN, false)
      .and.to.emit(cashier, "PaymentRecorded");
    const [table] = await bluff.getTable(1);
    expect(table.status).to.equal(WAITING);
    expect(table.buyIn).to.equal(BUY_IN);
    expect(await chipBalance(chips, alice)).to.equal(90n * CHIP);
    const paid = await cashier.paymentOf(1, alice.address);
    expect(
      await fhevm.userDecryptEuint(FhevmType.euint64, paid, await cashier.getAddress(), alice)
    ).to.equal(BUY_IN);
  });

  it("joins a paid table", async function () {
    const { alice, bob, chips, bluff, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await claimChips(faucet, bob);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    await expect(payToJoin(chips, cashier, bob, 1n, BUY_IN))
      .to.emit(bluff, "PlayerJoined")
      .withArgs(1n, bob.address, 1);
    expect(await chipBalance(chips, bob)).to.equal(90n * CHIP);
  });

  it("hands back a payment that is not exactly the buy-in, and records nothing paid", async function () {
    const { alice, bob, carol, chips, bluff, cashier, faucet } = await deployGameFixture();
    for (const player of [alice, bob, carol]) await claimChips(faucet, player);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    await payToJoin(chips, cashier, bob, 1n, 5n * CHIP);
    await payToJoin(chips, cashier, carol, 1n, 25n * CHIP);
    for (const player of [bob, carol]) {
      expect(await chipBalance(chips, player)).to.equal(100n * CHIP);
      const paid = await cashier.paymentOf(1, player.address);
      expect(
        await fhevm.userDecryptEuint(FhevmType.euint64, paid, await cashier.getAddress(), player)
      ).to.equal(0n);
      expect(await bluff.tableOf(player.address)).to.equal(1n);
    }
  });

  it("seats a player with no chips but records nothing paid", async function () {
    const { alice, bob, chips, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    await payToJoin(chips, cashier, bob, 1n, BUY_IN);
    const paid = await cashier.paymentOf(1, bob.address);
    expect(
      await fhevm.userDecryptEuint(FhevmType.euint64, paid, await cashier.getAddress(), bob)
    ).to.equal(0n);
  });

  it("refuses buy-ins that are not on the list", async function () {
    const { alice, chips, bluff, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    for (const buyIn of [0n, 7n * CHIP, 100n * CHIP]) {
      await expect(payToCreate(chips, cashier, alice, 2, buyIn, BUY_IN))
        .to.be.revertedWithCustomError(bluff, "InvalidBuyIn")
        .withArgs(buyIn);
    }
  });

  it("keeps free and paid tables apart", async function () {
    const { alice, bob, chips, bluff, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await claimChips(faucet, bob);
    await bluff.connect(alice).createFreeTable(3, false);
    await expect(payToJoin(chips, cashier, bob, 1n, BUY_IN))
      .to.be.revertedWithCustomError(bluff, "InvalidBuyIn")
      .withArgs(0n);
    await bluff.connect(alice).leaveTable(1);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    await expect(bluff.connect(bob).joinFreeTable(2))
      .to.be.revertedWithCustomError(bluff, "InvalidBuyIn")
      .withArgs(BUY_IN);
  });

  it("refuses malformed call data", async function () {
    const { alice, chips, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await expect(payAndCall(chips, cashier, alice, BUY_IN, "0x1234")).to.be.revertedWithCustomError(
      cashier,
      "InvalidCallbackData"
    );
    const tooLong = joinData(CREATE, 0n, 2, BUY_IN, false) + "00".repeat(32);
    await expect(payAndCall(chips, cashier, alice, BUY_IN, tooLong)).to.be.revertedWithCustomError(
      cashier,
      "InvalidCallbackData"
    );
  });

  it("refuses a second table for a seated player", async function () {
    const { alice, chips, bluff, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    await expect(payAndCall(chips, cashier, alice, BUY_IN, joinData(JOIN, 1n, 0, 0n, false)))
      .to.be.revertedWithCustomError(bluff, "AlreadyAtTable")
      .withArgs(1n);
    expect(await chipBalance(chips, alice)).to.equal(90n * CHIP);
  });

  describe("access between the contracts", function () {
    it("accepts the payment callback only from the chip token", async function () {
      const { alice, cashier } = await deployGameFixture();
      await expect(
        cashier
          .connect(alice)
          .onConfidentialTransferReceived(alice.address, alice.address, ZeroHash, "0x")
      )
        .to.be.revertedWithCustomError(cashier, "UnauthorizedCallback")
        .withArgs(alice.address);
    });

    it("lets only the cashier seat paid players or start tables", async function () {
      const { alice, bluff } = await deployGameFixture();
      await expect(
        bluff.connect(alice).seatPaidPlayer(alice.address, {
          action: CREATE,
          tableId: 0n,
          seatCount: 2,
          buyIn: BUY_IN,
          isPrivate: false,
        })
      )
        .to.be.revertedWithCustomError(bluff, "NotCashier")
        .withArgs(alice.address);
      await expect(bluff.connect(alice).startIfFull(1))
        .to.be.revertedWithCustomError(bluff, "NotCashier")
        .withArgs(alice.address);
    });

    it("lets only the game publish, refund or pay out", async function () {
      const { alice, cashier } = await deployGameFixture();
      await expect(cashier.connect(alice).publishPayments(1, [alice.address]))
        .to.be.revertedWithCustomError(cashier, "NotBluff")
        .withArgs(alice.address);
      await expect(cashier.connect(alice).refund(1, alice.address))
        .to.be.revertedWithCustomError(cashier, "NotBluff")
        .withArgs(alice.address);
      await expect(cashier.connect(alice).payOut(1, [alice.address]))
        .to.be.revertedWithCustomError(cashier, "NotBluff")
        .withArgs(alice.address);
    });

    it("stops paid joins while either contract is paused", async function () {
      const { owner, alice, chips, bluff, cashier, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await cashier.connect(owner).pause();
      await expect(payToCreate(chips, cashier, alice, 2, BUY_IN)).to.be.revertedWithCustomError(
        cashier,
        "EnforcedPause"
      );
      await cashier.connect(owner).unpause();
      await bluff.connect(owner).pause();
      await expect(payToCreate(chips, cashier, alice, 2, BUY_IN)).to.be.revertedWithCustomError(
        bluff,
        "EnforcedPause"
      );
    });
  });
});
