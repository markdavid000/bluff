import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { fhevm } from "hardhat";
import { deployGameFixture } from "../fixtures";
import { CHIP, claimChips, payToCreate, seatPaidTable } from "../helpers/chips";
import { startFreeGame } from "../helpers/tables";

const BUY_IN = 10n * CHIP;

async function canUserDecrypt(
  type: FhevmType,
  handle: string,
  contract: string,
  reader: HardhatEthersSigner
): Promise<boolean> {
  try {
    if (type === FhevmType.ebool) {
      await fhevm.userDecryptEbool(handle, contract, reader);
    } else {
      await fhevm.userDecryptEuint(type as FhevmType.euint8, handle, contract, reader);
    }
    return true;
  } catch {
    return false;
  }
}

async function canPublicDecrypt(handle: string): Promise<boolean> {
  try {
    await fhevm.publicDecrypt([handle]);
    return true;
  } catch {
    return false;
  }
}

describe("confidentiality", function () {
  it("shows each die only to its owner until a bluff is called", async function () {
    const { owner, alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob, carol]);
    const bluffAddress = await bluff.getAddress();
    for (const handle of await bluff.diceOf(id, alice.address)) {
      expect(await canUserDecrypt(FhevmType.euint8, handle, bluffAddress, alice)).to.equal(true);
      for (const reader of [bob, carol, owner]) {
        expect(await canUserDecrypt(FhevmType.euint8, handle, bluffAddress, reader)).to.equal(
          false
        );
      }
      expect(await canPublicDecrypt(handle)).to.equal(false);
    }
  });

  it("makes every die public once a bluff is called, and only then", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    const handles = [
      ...(await bluff.diceOf(id, alice.address)),
      ...(await bluff.diceOf(id, bob.address)),
    ];
    for (const handle of handles) expect(await canPublicDecrypt(handle)).to.equal(false);
    await bluff.connect(alice).placeBid(id, 1, 2);
    await bluff.connect(bob).callBluff(id);
    for (const handle of handles) expect(await canPublicDecrypt(handle)).to.equal(true);
  });

  it("gives the owner no way to read dice", async function () {
    const { owner, alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    const [handle] = await bluff.diceOf(id, alice.address);
    expect(
      await canUserDecrypt(FhevmType.euint8, handle, await bluff.getAddress(), owner)
    ).to.equal(false);
  });

  it("shows a payment only to its payer, and the paid-in-full flags only during the check", async function () {
    const contracts = await deployGameFixture();
    const { owner, alice, bob, carol, bluff, cashier } = contracts;
    const id = await seatPaidTable(contracts, [alice, bob], BUY_IN);
    const cashierAddress = await cashier.getAddress();
    const paid = await cashier.paymentOf(id, alice.address);
    expect(await canUserDecrypt(FhevmType.euint64, paid, cashierAddress, alice)).to.equal(true);
    for (const reader of [bob, carol, owner]) {
      expect(await canUserDecrypt(FhevmType.euint64, paid, cashierAddress, reader)).to.equal(false);
    }
    expect(await canPublicDecrypt(paid)).to.equal(false);
    for (const flag of await bluff.revealHandles(id)) {
      expect(await canPublicDecrypt(flag)).to.equal(true);
    }
  });

  it("keeps paid-in-full flags private before the table fills", async function () {
    const { alice, bluff, chips, cashier, faucet } = await deployGameFixture();
    await claimChips(faucet, alice);
    await payToCreate(chips, cashier, alice, 3, BUY_IN);
    const id = await bluff.tableOf(alice.address);
    const [flag] = await cashier.paymentHandles(id, [alice.address]);
    expect(await canPublicDecrypt(flag)).to.equal(false);
    expect(await canUserDecrypt(FhevmType.ebool, flag, await cashier.getAddress(), alice)).to.equal(
      true
    );
  });
});
