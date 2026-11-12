import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { fhevm } from "hardhat";
import { deployGameFixture } from "../fixtures";
import {
  CHIP,
  CREATE,
  chipBalance,
  claimChips,
  confirmSeats,
  joinData,
  payAndCall,
  payToCreate,
  payToJoin,
  seatPaidTable,
} from "../helpers/chips";
import { readyAndStart } from "../helpers/tables";

const WAITING = 1n;
const VERIFYING = 2n;
const PLAYING = 3n;
const CANCELLED = 6n;
const BUY_IN = 10n * CHIP;
const LIMIT = 10 * 60;

describe("checking paid seats", function () {
  it("checks every payment when the host starts a paid table", async function () {
    const contracts = await deployGameFixture();
    const { alice, bob, bluff } = contracts;
    await claimChips(contracts.faucet, alice);
    await claimChips(contracts.faucet, bob);
    await payToCreate(contracts.chips, contracts.cashier, alice, 2, BUY_IN);
    await payToJoin(contracts.chips, contracts.cashier, bob, 1n, BUY_IN);
    await bluff.connect(bob).setReady(1, true);
    await expect(bluff.connect(alice).startTable(1)).to.emit(bluff, "SeatVerificationStarted");
    const [table] = await bluff.getTable(1);
    expect(table.status).to.equal(VERIFYING);
    expect(await bluff.openTableCount()).to.equal(0n);
    expect(await bluff.revealHandles(1)).to.have.length(2);
  });

  it("starts the game when everyone paid in full", async function () {
    const contracts = await deployGameFixture();
    const { alice, bob, bluff } = contracts;
    const id = await seatPaidTable(contracts, [alice, bob], BUY_IN);
    await expect(confirmSeats(bluff, id, bob))
      .to.emit(bluff, "GameStarted")
      .and.to.emit(bluff, "RoundStarted");
    const [table] = await bluff.getTable(id);
    expect(table.status).to.equal(PLAYING);
    expect(await bluff.diceOf(id, alice.address)).to.have.length(4);
  });

  it("removes a seat that did not pay and reopens the table", async function () {
    const contracts = await deployGameFixture();
    const { alice, bob, carol, bluff, chips, cashier, faucet } = contracts;
    await claimChips(faucet, alice);
    await claimChips(faucet, carol);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    await payToJoin(chips, cashier, bob, 1n, BUY_IN);
    await payToJoin(chips, cashier, carol, 1n, BUY_IN);
    await readyAndStart(bluff, 1n, [alice, bob, carol]);
    await expect(confirmSeats(bluff, 1n, carol))
      .to.emit(bluff, "SeatRemoved")
      .withArgs(1n, bob.address)
      .and.to.emit(bluff, "TableReopened")
      .and.to.emit(bluff, "TableListed")
      .withArgs(1n);
    const [table, seats] = await bluff.getTable(1);
    expect(table.status).to.equal(WAITING);
    expect(table.deadline - BigInt(await time.latest())).to.equal(BigInt(LIMIT));
    expect(seats.map((seat) => seat.player)).to.deep.equal([alice.address, carol.address]);
    expect(await bluff.tableOf(bob.address)).to.equal(0n);
  });

  it("reopens a private table without listing it", async function () {
    const { alice, bob, carol, bluff, chips, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await claimChips(faucet, carol);
    await payAndCall(chips, cashier, alice, BUY_IN, joinData(CREATE, 0n, 3, BUY_IN, true));
    await payToJoin(chips, cashier, bob, 1n, BUY_IN);
    await payToJoin(chips, cashier, carol, 1n, BUY_IN);
    await readyAndStart(bluff, 1n, [alice, bob, carol]);
    await expect(confirmSeats(bluff, 1n, carol))
      .to.emit(bluff, "TableReopened")
      .and.not.to.emit(bluff, "TableListed");
    expect(await bluff.openTableCount()).to.equal(0n);
  });

  it("hands the host role on when the host did not pay", async function () {
    const contracts = await deployGameFixture();
    const { alice, bob, bluff, chips, cashier, faucet } = contracts;
    await claimChips(faucet, bob);
    await payToCreate(chips, cashier, alice, 2, BUY_IN);
    await payToJoin(chips, cashier, bob, 1n, BUY_IN);
    await readyAndStart(bluff, 1n, [alice, bob]);
    await expect(confirmSeats(bluff, 1n, bob))
      .to.emit(bluff, "HostChanged")
      .withArgs(1n, bob.address);
  });

  it("closes the table when nobody paid", async function () {
    const { alice, bob, bluff, chips, cashier } = await deployGameFixture();
    await payToCreate(chips, cashier, alice, 2, BUY_IN);
    await payToJoin(chips, cashier, bob, 1n, BUY_IN);
    await readyAndStart(bluff, 1n, [alice, bob]);
    await expect(confirmSeats(bluff, 1n, bob))
      .to.emit(bluff, "TableCancelled")
      .withArgs(1n);
    expect((await bluff.getTable(1))[0].status).to.equal(CANCELLED);
  });

  it("accepts a check only once and refuses a forged one", async function () {
    const contracts = await deployGameFixture();
    const { alice, bob, bluff } = contracts;
    const id = await seatPaidTable(contracts, [alice, bob], BUY_IN);
    const result = await fhevm.publicDecrypt([...(await bluff.revealHandles(id))]);
    const forged = result.abiEncodedClearValues.slice(0, -1) + "0";
    await expect(bluff.confirmSeats(id, forged, result.decryptionProof)).to.be.reverted;
    await bluff.confirmSeats(id, result.abiEncodedClearValues, result.decryptionProof);
    await expect(bluff.confirmSeats(id, result.abiEncodedClearValues, result.decryptionProof))
      .to.be.revertedWithCustomError(bluff, "WrongStatus")
      .withArgs(id, PLAYING);
  });

  it("refunds a player who leaves during the check and reopens the table", async function () {
    const contracts = await deployGameFixture();
    const { alice, bob, bluff, chips, cashier } = contracts;
    const id = await seatPaidTable(contracts, [alice, bob], BUY_IN);
    await expect(bluff.connect(bob).leaveTable(id))
      .to.emit(bluff, "PlayerLeft")
      .withArgs(id, bob.address, true)
      .and.to.emit(cashier, "Refunded")
      .and.to.emit(bluff, "TableReopened");
    expect(await chipBalance(chips, bob)).to.equal(100n * CHIP);
    expect((await bluff.getTable(id))[0].status).to.equal(WAITING);
  });

  it("can be cancelled after 10 minutes with exact refunds", async function () {
    const contracts = await deployGameFixture();
    const { alice, bob, carol, bluff, chips } = contracts;
    const id = await seatPaidTable(contracts, [alice, bob], BUY_IN);
    const [table] = await bluff.getTable(id);
    await expect(bluff.connect(carol).cancelVerification(id))
      .to.be.revertedWithCustomError(bluff, "DeadlineNotPassed")
      .withArgs(table.deadline);
    await time.increase(LIMIT + 1);
    await expect(bluff.connect(carol).cancelVerification(id)).to.emit(bluff, "TableCancelled");
    expect(await chipBalance(chips, alice)).to.equal(100n * CHIP);
    expect(await chipBalance(chips, bob)).to.equal(100n * CHIP);
    expect(await bluff.tableOf(alice.address)).to.equal(0n);
  });
});
