import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { decryptDice } from "../helpers/dice";
import { startFreeGame } from "../helpers/tables";
import { deployGameFixture } from "../fixtures";

const SUBCLASS_MOCK: { kind: "uups"; unsafeAllow: "missing-initializer"[] } = {
  kind: "uups",
  unsafeAllow: ["missing-initializer"],
};

describe("upgrade", function () {
  it("runs initialize only once on the proxy", async function () {
    const { owner, chips, dollars, bluff, faucet } = await deployGameFixture();
    await expect(
      bluff.initialize(owner.address, await chips.getAddress())
    ).to.be.revertedWithCustomError(bluff, "InvalidInitialization");
    await expect(
      faucet.initialize(owner.address, await chips.getAddress(), await dollars.getAddress())
    ).to.be.revertedWithCustomError(faucet, "InvalidInitialization");
  });

  it("never lets anyone initialise the implementation", async function () {
    const { alice, chips, dollars, bluff, faucet } = await deployGameFixture();
    const bluffImplementation = await ethers.getContractAt(
      "Bluff",
      await upgrades.erc1967.getImplementationAddress(await bluff.getAddress())
    );
    await expect(
      bluffImplementation.initialize(alice.address, await chips.getAddress())
    ).to.be.revertedWithCustomError(bluffImplementation, "InvalidInitialization");
    const faucetImplementation = await ethers.getContractAt(
      "ChipFaucet",
      await upgrades.erc1967.getImplementationAddress(await faucet.getAddress())
    );
    await expect(
      faucetImplementation.initialize(
        alice.address,
        await chips.getAddress(),
        await dollars.getAddress()
      )
    ).to.be.revertedWithCustomError(faucetImplementation, "InvalidInitialization");
  });

  it("lets only the owner upgrade", async function () {
    const { alice, bluff, faucet } = await deployGameFixture();
    const bluffV2 = await ethers.deployContract("BluffV2Mock");
    await expect(bluff.connect(alice).upgradeToAndCall(await bluffV2.getAddress(), "0x"))
      .to.be.revertedWithCustomError(bluff, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);
    const faucetV2 = await ethers.deployContract("ChipFaucetV2Mock");
    await expect(faucet.connect(alice).upgradeToAndCall(await faucetV2.getAddress(), "0x"))
      .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);
  });

  it("keeps the address, owner, settings and pause state across an upgrade", async function () {
    const { owner, chips, dollars, bluff, faucet } = await deployGameFixture();
    await bluff.connect(owner).pause();
    const bluffAddress = await bluff.getAddress();
    const upgradedBluff = await upgrades.upgradeProxy(
      bluffAddress,
      await ethers.getContractFactory("BluffV2Mock"),
      { ...SUBCLASS_MOCK, call: { fn: "initializeV2", args: [42] } }
    );
    expect(await upgradedBluff.getAddress()).to.equal(bluffAddress);
    expect(await upgradedBluff.version()).to.equal("2.0.0");
    expect(await upgradedBluff.upgradeMarker()).to.equal(42n);
    expect(await upgradedBluff.owner()).to.equal(owner.address);
    expect(await upgradedBluff.chips()).to.equal(await chips.getAddress());
    expect(await upgradedBluff.paused()).to.equal(true);

    const faucetAddress = await faucet.getAddress();
    const upgradedFaucet = await upgrades.upgradeProxy(
      faucetAddress,
      await ethers.getContractFactory("ChipFaucetV2Mock"),
      { ...SUBCLASS_MOCK, call: { fn: "initializeV2", args: [7] } }
    );
    expect(await upgradedFaucet.getAddress()).to.equal(faucetAddress);
    expect(await upgradedFaucet.version()).to.equal("2.0.0");
    expect(await upgradedFaucet.upgradeMarker()).to.equal(7n);
    expect(await upgradedFaucet.chips()).to.equal(await chips.getAddress());
    expect(await upgradedFaucet.dollars()).to.equal(await dollars.getAddress());
  });

  it("runs an upgrade's reinitializer only once", async function () {
    const { bluff } = await deployGameFixture();
    const upgraded = await upgrades.upgradeProxy(
      await bluff.getAddress(),
      await ethers.getContractFactory("BluffV2Mock"),
      { ...SUBCLASS_MOCK, call: { fn: "initializeV2", args: [1] } }
    );
    await expect(upgraded.initializeV2(2)).to.be.revertedWithCustomError(
      upgraded,
      "InvalidInitialization"
    );
  });

  it("keeps hidden dice readable by their owner across an upgrade", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    const before = await decryptDice(bluff, id, alice);
    await upgrades.upgradeProxy(
      await bluff.getAddress(),
      await ethers.getContractFactory("BluffV2Mock"),
      { ...SUBCLASS_MOCK, call: { fn: "initializeV2", args: [1] } }
    );
    expect(await decryptDice(bluff, id, alice)).to.deep.equal(before);
    await expect(bluff.connect(alice).placeBid(id, 1, 2)).to.emit(bluff, "BidPlaced");
  });

  it("refuses an upgrade to the zero address", async function () {
    const { owner, bluff, faucet } = await deployGameFixture();
    await expect(
      bluff.connect(owner).upgradeToAndCall(ethers.ZeroAddress, "0x")
    ).to.be.revertedWithCustomError(bluff, "ZeroAddress");
    await expect(
      faucet.connect(owner).upgradeToAndCall(ethers.ZeroAddress, "0x")
    ).to.be.revertedWithCustomError(faucet, "ZeroAddress");
  });

  it("passes the storage layout check for both contracts", async function () {
    await upgrades.validateImplementation(await ethers.getContractFactory("Bluff"), {
      kind: "uups",
    });
    await upgrades.validateImplementation(await ethers.getContractFactory("ChipFaucet"), {
      kind: "uups",
    });
    await upgrades.validateUpgrade(
      await ethers.getContractFactory("Bluff"),
      await ethers.getContractFactory("BluffV2Mock"),
      SUBCLASS_MOCK
    );
    await upgrades.validateUpgrade(
      await ethers.getContractFactory("ChipFaucet"),
      await ethers.getContractFactory("ChipFaucetV2Mock"),
      SUBCLASS_MOCK
    );
  });
});
