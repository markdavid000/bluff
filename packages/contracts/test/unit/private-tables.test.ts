import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { AbiCoder, keccak256, toBeHex, zeroPadValue } from "ethers";
import { ethers, fhevm, network, upgrades } from "hardhat";
import { deployGameFixture } from "../fixtures";
import { proveCode } from "../helpers/invites";
import { tableIdFrom } from "../helpers/table-ids";
import {
  CHIP,
  CREATE,
  chipBalance,
  claimChips,
  joinData,
  payAndCall,
  payToJoin,
} from "../helpers/chips";

const BUY_IN = 10n * CHIP;
const WAITING = 1n;
const MAX_ID = 2n ** 48n;
const BLUFF_STORAGE = 0x23b5f92c78153b667665d35bef9c2d58f327709d7637cfd5b4e5892e2333f700n;
const NONCE_SLOT = BLUFF_STORAGE + 1n;
const TABLES_SLOT = BLUFF_STORAGE + 2n;

async function nextId(bluffAddress: string, host: string, prevrandao: bigint): Promise<bigint> {
  const nonce = BigInt(await ethers.provider.getStorage(bluffAddress, NONCE_SLOT));
  return tableIdFrom(prevrandao, host, nonce + 1n);
}

async function occupy(bluffAddress: string, id: bigint) {
  const slot = keccak256(
    AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [id, TABLES_SLOT])
  );
  const statusWaiting = WAITING << 160n;
  await network.provider.send("hardhat_setStorageAt", [
    bluffAddress,
    slot,
    zeroPadValue(toBeHex(statusWaiting), 32),
  ]);
}

describe("private tables and table numbers", function () {
  describe("table numbers", function () {
    it("gives each table a random number, never 0 and never counting up", async function () {
      const { alice, bob, carol, bluff } = await deployGameFixture();
      const ids: bigint[] = [];
      for (const host of [alice, bob, carol]) {
        await (await bluff.connect(host).createFreeTable(2, false)).wait();
        ids.push(await bluff.tableOf(host.address));
      }
      for (const id of ids) {
        expect(id).to.be.greaterThan(0n);
        expect(id).to.be.lessThan(MAX_ID);
      }
      expect(new Set(ids).size).to.equal(3);
      expect(ids).not.to.deep.equal([1n, 2n, 3n]);
    });

    it("announces the number it picked", async function () {
      const { alice, bluff } = await deployGameFixture();
      const receipt = await (await bluff.connect(alice).createFreeTable(2, false)).wait();
      const created = receipt?.logs
        .map((log) => bluff.interface.parseLog(log))
        .find((log) => log?.name === "TableCreated");
      expect(created?.args.id).to.equal(await bluff.tableOf(alice.address));
    });

    it("makes the number from the block's randomness, the host and a counter", async function () {
      const { alice, bluff } = await deployGameFixture();
      const prevrandao = 987654321n;
      const expected = await nextId(await bluff.getAddress(), alice.address, prevrandao);
      await network.provider.send("hardhat_setPrevRandao", [zeroPadValue(toBeHex(prevrandao), 32)]);
      await (await bluff.connect(alice).createFreeTable(2, false)).wait();
      expect(await bluff.tableOf(alice.address)).to.equal(expected);
    });

    it("skips a number that already belongs to a table", async function () {
      const { alice, bluff } = await deployGameFixture();
      const address = await bluff.getAddress();
      const prevrandao = 123456789n;
      const taken = await nextId(address, alice.address, prevrandao);
      await occupy(address, taken);
      await network.provider.send("hardhat_setPrevRandao", [zeroPadValue(toBeHex(prevrandao), 32)]);
      await (await bluff.connect(alice).createFreeTable(2, false)).wait();
      const id = await bluff.tableOf(alice.address);
      expect(id).not.to.equal(taken);
      expect(id).to.be.greaterThan(0n);
      const [table] = await bluff.getTable(id);
      expect(table.host).to.equal(alice.address);
    });
  });

  describe("linking the invites contract", function () {
    it("lets only the owner link it, once, to a real address", async function () {
      const { owner, alice } = await deployGameFixture();
      const bluff = await upgrades.deployProxy(
        await ethers.getContractFactory("Bluff"),
        [owner.address],
        {
          kind: "uups",
        }
      );
      await expect(bluff.connect(alice).getFunction("setInvites")(alice.address))
        .to.be.revertedWithCustomError(bluff, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
      await expect(
        bluff.connect(owner).getFunction("setInvites")(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(bluff, "ZeroAddress");
      await expect(bluff.connect(owner).getFunction("setInvites")(alice.address))
        .to.emit(bluff, "InvitesSet")
        .withArgs(alice.address);
      expect(await bluff.getFunction("invites")()).to.equal(alice.address);
      await expect(
        bluff.connect(owner).getFunction("setInvites")(owner.address)
      ).to.be.revertedWithCustomError(bluff, "InvitesAlreadySet");
    });

    it("can't make a private table until the invites contract is linked", async function () {
      const { owner, alice } = await deployGameFixture();
      const bluff = await upgrades.deployProxy(
        await ethers.getContractFactory("Bluff"),
        [owner.address],
        {
          kind: "uups",
        }
      );
      await expect(bluff.connect(alice).getFunction("createFreeTable")(2, true)).to.be.reverted;
      await expect(bluff.connect(alice).getFunction("createFreeTable")(2, false)).to.emit(
        bluff,
        "TableCreated"
      );
    });
  });

  describe("free private tables", function () {
    it("makes a code only the host can read, and none for a public table", async function () {
      const { alice, bob, bluff, invites } = await deployGameFixture();
      await (await bluff.connect(alice).createFreeTable(2, true)).wait();
      const id = await bluff.tableOf(alice.address);
      await (await bluff.connect(bob).createFreeTable(2, false)).wait();
      const open = await bluff.tableOf(bob.address);
      const address = await invites.getAddress();
      expect(await invites.isInvited(id, alice.address)).to.equal(true);
      expect(
        await fhevm.userDecryptEuint(FhevmType.euint64, await invites.codeOf(id), address, alice)
      ).to.be.a("bigint");
      const bobReads = await fhevm
        .userDecryptEuint(FhevmType.euint64, await invites.codeOf(id), address, bob)
        .then(
          () => true,
          () => false
        );
      expect(bobReads).to.equal(false);
      expect(await invites.codeOf(open)).to.equal(ethers.ZeroHash);
    });

    it("turns away a player without the code", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await (await bluff.connect(alice).createFreeTable(2, true)).wait();
      const id = await bluff.tableOf(alice.address);
      await expect(bluff.connect(bob).joinFreeTable(id))
        .to.be.revertedWithCustomError(bluff, "NotInvited")
        .withArgs(id);
      expect(await bluff.tableOf(bob.address)).to.equal(0n);
    });

    it("seats a player who proved the code", async function () {
      const { alice, bob, bluff, invites } = await deployGameFixture();
      await (await bluff.connect(alice).createFreeTable(2, true)).wait();
      const id = await bluff.tableOf(alice.address);
      await proveCode(invites, id, alice, bob);
      await expect(bluff.connect(bob).joinFreeTable(id))
        .to.emit(bluff, "PlayerJoined")
        .withArgs(id, bob.address, 1);
    });

    it("lets an invited player who left come back", async function () {
      const { alice, bob, bluff, invites } = await deployGameFixture();
      await (await bluff.connect(alice).createFreeTable(3, true)).wait();
      const id = await bluff.tableOf(alice.address);
      await proveCode(invites, id, alice, bob);
      await (await bluff.connect(bob).joinFreeTable(id)).wait();
      await (await bluff.connect(bob).leaveTable(id)).wait();
      await expect(bluff.connect(bob).joinFreeTable(id)).to.emit(bluff, "PlayerJoined");
    });

    it("still lets anyone join a public table", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await (await bluff.connect(alice).createFreeTable(2, false)).wait();
      const id = await bluff.tableOf(alice.address);
      await expect(bluff.connect(bob).joinFreeTable(id)).to.emit(bluff, "PlayerJoined");
    });
  });

  describe("paid private tables", function () {
    it("makes a code when the host pays to create", async function () {
      const { alice, bluff, invites, chips, cashier, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await (
        await payAndCall(chips, cashier, alice, BUY_IN, joinData(CREATE, 0n, 2, BUY_IN, true))
      ).wait();
      const id = await bluff.tableOf(alice.address);
      expect(await invites.isInvited(id, alice.address)).to.equal(true);
      expect(await invites.codeOf(id)).not.to.equal(ethers.ZeroHash);
    });

    it("turns away a paying player without the code, leaving their chips untouched", async function () {
      const { alice, bob, bluff, chips, cashier, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await claimChips(faucet, bob);
      await (
        await payAndCall(chips, cashier, alice, BUY_IN, joinData(CREATE, 0n, 2, BUY_IN, true))
      ).wait();
      const id = await bluff.tableOf(alice.address);
      const before = await chipBalance(chips, bob);
      await expect(payToJoin(chips, cashier, bob, id, BUY_IN))
        .to.be.revertedWithCustomError(bluff, "NotInvited")
        .withArgs(id);
      expect(await chipBalance(chips, bob)).to.equal(before);
      expect(await bluff.tableOf(bob.address)).to.equal(0n);
    });

    it("seats a paying player who proved the code", async function () {
      const { alice, bob, bluff, invites, chips, cashier, faucet } = await deployGameFixture();
      await claimChips(faucet, alice);
      await claimChips(faucet, bob);
      await (
        await payAndCall(chips, cashier, alice, BUY_IN, joinData(CREATE, 0n, 2, BUY_IN, true))
      ).wait();
      const id = await bluff.tableOf(alice.address);
      await proveCode(invites, id, alice, bob);
      await (await payToJoin(chips, cashier, bob, id, BUY_IN)).wait();
      expect(await bluff.tableOf(bob.address)).to.equal(id);
    });
  });
});
