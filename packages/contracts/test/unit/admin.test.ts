import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { deployGameFixture } from "../fixtures";

describe("admin", function () {
  describe("initialisation", function () {
    it("sets the owner, the chip token and version 1.0.0, unpaused", async function () {
      const { owner, chips, dollars, bluff, faucet } = await deployGameFixture();
      expect(await bluff.owner()).to.equal(owner.address);
      expect(await bluff.chips()).to.equal(await chips.getAddress());
      expect(await bluff.version()).to.equal("1.0.0");
      expect(await bluff.paused()).to.equal(false);
      expect(await faucet.owner()).to.equal(owner.address);
      expect(await faucet.chips()).to.equal(await chips.getAddress());
      expect(await faucet.dollars()).to.equal(await dollars.getAddress());
      expect(await faucet.version()).to.equal("1.0.0");
      expect(await faucet.paused()).to.equal(false);
    });

    it("refuses a missing chip token", async function () {
      const { owner, dollars } = await deployGameFixture();
      const bluffFactory = await ethers.getContractFactory("Bluff");
      await expect(
        upgrades.deployProxy(bluffFactory, [owner.address, ethers.ZeroAddress], { kind: "uups" })
      ).to.be.revertedWithCustomError(bluffFactory, "ZeroAddress");
      const faucetFactory = await ethers.getContractFactory("ChipFaucet");
      await expect(
        upgrades.deployProxy(
          faucetFactory,
          [owner.address, ethers.ZeroAddress, await dollars.getAddress()],
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(faucetFactory, "ZeroAddress");
    });

    it("refuses a missing dollar token for the faucet", async function () {
      const { owner, chips } = await deployGameFixture();
      const faucetFactory = await ethers.getContractFactory("ChipFaucet");
      await expect(
        upgrades.deployProxy(
          faucetFactory,
          [owner.address, await chips.getAddress(), ethers.ZeroAddress],
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(faucetFactory, "ZeroAddress");
    });

    it("refuses a missing owner", async function () {
      const { chips } = await deployGameFixture();
      const bluffFactory = await ethers.getContractFactory("Bluff");
      await expect(
        upgrades.deployProxy(bluffFactory, [ethers.ZeroAddress, await chips.getAddress()], {
          kind: "uups",
        })
      ).to.be.revertedWithCustomError(bluffFactory, "OwnableInvalidOwner");
    });
  });

  describe("pausing", function () {
    it("lets only the owner pause and unpause, with events", async function () {
      const { owner, alice, bluff, faucet } = await deployGameFixture();
      for (const contract of [bluff, faucet]) {
        await expect(contract.connect(alice).pause())
          .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
          .withArgs(alice.address);
        await expect(contract.connect(owner).pause())
          .to.emit(contract, "Paused")
          .withArgs(owner.address);
        expect(await contract.paused()).to.equal(true);
        await expect(contract.connect(alice).unpause())
          .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
          .withArgs(alice.address);
        await expect(contract.connect(owner).unpause())
          .to.emit(contract, "Unpaused")
          .withArgs(owner.address);
        expect(await contract.paused()).to.equal(false);
      }
    });
  });

  describe("pause scope", function () {
    it("stops new tables and joins while paused, and only those", async function () {
      const { owner, alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(owner).pause();
      await expect(bluff.connect(bob).createFreeTable(2, false)).to.be.revertedWithCustomError(
        bluff,
        "EnforcedPause"
      );
      await expect(bluff.connect(bob).joinFreeTable(1)).to.be.revertedWithCustomError(
        bluff,
        "EnforcedPause"
      );
      await expect(bluff.connect(alice).leaveTable(1)).to.emit(bluff, "PlayerLeft");
    });

    it("lets a waiting table start while paused", async function () {
      const { owner, alice, bob, bluff } = await deployGameFixture();
      await bluff.connect(alice).createFreeTable(3, false);
      await bluff.connect(bob).joinFreeTable(1);
      await bluff.connect(owner).pause();
      await expect(bluff.connect(alice).startTable(1)).to.emit(bluff, "GameStarted");
    });
  });

  describe("ownership", function () {
    it("moves only when the new owner accepts", async function () {
      const { owner, alice, bob, bluff, faucet } = await deployGameFixture();
      for (const contract of [bluff, faucet]) {
        await expect(contract.connect(owner).transferOwnership(alice.address))
          .to.emit(contract, "OwnershipTransferStarted")
          .withArgs(owner.address, alice.address);
        expect(await contract.owner()).to.equal(owner.address);
        expect(await contract.pendingOwner()).to.equal(alice.address);
        await expect(contract.connect(bob).acceptOwnership())
          .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
          .withArgs(bob.address);
        await expect(contract.connect(alice).acceptOwnership())
          .to.emit(contract, "OwnershipTransferred")
          .withArgs(owner.address, alice.address);
        expect(await contract.owner()).to.equal(alice.address);
      }
    });

    it("lets only the owner start a transfer", async function () {
      const { alice, bob, bluff } = await deployGameFixture();
      await expect(bluff.connect(alice).transferOwnership(bob.address))
        .to.be.revertedWithCustomError(bluff, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });
  });
});
