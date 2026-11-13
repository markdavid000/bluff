import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm, upgrades } from "hardhat";
import type { BluffInvites } from "../../types";

const TABLE = 482915736201844n;
const OTHER_TABLE = 7n;

async function deployInvitesFixture() {
  const [owner, game, host, alice, bob, stranger] = await ethers.getSigners();
  const invites = (await upgrades.deployProxy(
    await ethers.getContractFactory("BluffInvites"),
    [owner.address, game.address],
    { kind: "uups" }
  )) as unknown as BluffInvites;
  return { owner, game, host, alice, bob, stranger, invites };
}

async function codeFor(invites: BluffInvites, id: bigint, reader: HardhatEthersSigner) {
  return fhevm.userDecryptEuint(
    FhevmType.euint64,
    await invites.codeOf(id),
    await invites.getAddress(),
    reader
  );
}

async function canRead(invites: BluffInvites, id: bigint, reader: HardhatEthersSigner) {
  return codeFor(invites, id, reader).then(
    () => true,
    () => false
  );
}

async function canPublicDecrypt(handle: string) {
  return fhevm.publicDecrypt([handle]).then(
    () => true,
    () => false
  );
}

async function tryCode(
  invites: BluffInvites,
  id: bigint,
  player: HardhatEthersSigner,
  guess: bigint
) {
  const input = await fhevm
    .createEncryptedInput(await invites.getAddress(), player.address)
    .add64(guess)
    .encrypt();
  return invites.connect(player).tryCode(id, input.handles[0], input.inputProof);
}

async function refusedBecause(action: Promise<unknown>, reason: string) {
  const error = await action.then(
    () => undefined,
    (thrown: unknown) => thrown as Error
  );
  expect(error, `expected a refusal for ${reason}`).not.to.equal(undefined);
  expect(error?.message).to.contain(reason);
}

async function revealAttempt(invites: BluffInvites, id: bigint, player: HardhatEthersSigner) {
  return fhevm.publicDecrypt([await invites.attemptOf(id, player.address)]);
}

async function confirm(
  invites: BluffInvites,
  id: bigint,
  player: HardhatEthersSigner,
  by: HardhatEthersSigner = player
) {
  const result = await revealAttempt(invites, id, player);
  return invites
    .connect(by)
    .confirmCode(id, player.address, result.abiEncodedClearValues, result.decryptionProof);
}

async function withCode() {
  const fixture = await deployInvitesFixture();
  await (await fixture.invites.connect(fixture.game).newCode(TABLE, fixture.host.address)).wait();
  const code = await codeFor(fixture.invites, TABLE, fixture.host);
  return { ...fixture, code };
}

describe("BluffInvites", function () {
  describe("setting up", function () {
    it("links to the game, with an owner, unpaused, at 1.0.0", async function () {
      const { owner, game, invites } = await deployInvitesFixture();
      expect(await invites.owner()).to.equal(owner.address);
      expect(await invites.bluff()).to.equal(game.address);
      expect(await invites.paused()).to.equal(false);
      expect(await invites.version()).to.equal("1.0.0");
    });

    it("refuses a missing game or owner", async function () {
      const [owner] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("BluffInvites");
      await expect(
        upgrades.deployProxy(factory, [owner.address, ethers.ZeroAddress], { kind: "uups" })
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
      await expect(
        upgrades.deployProxy(factory, [ethers.ZeroAddress, owner.address], { kind: "uups" })
      ).to.be.revertedWithCustomError(factory, "OwnableInvalidOwner");
    });
  });

  describe("making a code", function () {
    it("makes a code only the host can read, and counts the host as invited", async function () {
      const { game, host, alice, owner, invites } = await deployInvitesFixture();
      await expect(invites.connect(game).newCode(TABLE, host.address))
        .to.emit(invites, "CodeCreated")
        .withArgs(TABLE, host.address);
      expect(await invites.isInvited(TABLE, host.address)).to.equal(true);
      expect(await invites.isInvited(TABLE, alice.address)).to.equal(false);
      expect(await canRead(invites, TABLE, host)).to.equal(true);
      expect(await canRead(invites, TABLE, alice)).to.equal(false);
      expect(await canRead(invites, TABLE, owner)).to.equal(false);
      expect(await canRead(invites, TABLE, game)).to.equal(false);
    });

    it("gives each table its own code", async function () {
      const { game, host, invites } = await deployInvitesFixture();
      await invites.connect(game).newCode(TABLE, host.address);
      await invites.connect(game).newCode(OTHER_TABLE, host.address);
      expect(await invites.codeOf(TABLE)).not.to.equal(await invites.codeOf(OTHER_TABLE));
    });

    it("never lets the code be read publicly", async function () {
      const { invites } = await withCode();
      expect(await canPublicDecrypt(await invites.codeOf(TABLE))).to.equal(false);
    });

    it("takes codes only from the game", async function () {
      const { host, stranger, invites } = await deployInvitesFixture();
      await expect(invites.connect(stranger).newCode(TABLE, host.address))
        .to.be.revertedWithCustomError(invites, "NotBluff")
        .withArgs(stranger.address);
    });

    it("still makes codes while paused, so tables can be created", async function () {
      const { owner, game, host, invites } = await deployInvitesFixture();
      await invites.connect(owner).pause();
      await expect(invites.connect(game).newCode(TABLE, host.address)).to.emit(
        invites,
        "CodeCreated"
      );
    });
  });

  describe("proving the code", function () {
    it("invites a player with the right code, who can then read it to invite others", async function () {
      const { alice, invites, code } = await withCode();
      expect(await canRead(invites, TABLE, alice)).to.equal(false);
      await expect(tryCode(invites, TABLE, alice, code))
        .to.emit(invites, "CodeTried")
        .withArgs(TABLE, alice.address, 1);
      expect(await invites.triesOf(TABLE, alice.address)).to.equal(1);
      await expect(confirm(invites, TABLE, alice))
        .to.emit(invites, "Invited")
        .withArgs(TABLE, alice.address);
      expect(await invites.isInvited(TABLE, alice.address)).to.equal(true);
      expect(await codeFor(invites, TABLE, alice)).to.equal(code);
    });

    it("lets anyone send the proven answer for the player", async function () {
      const { alice, bob, invites, code } = await withCode();
      await tryCode(invites, TABLE, alice, code);
      await confirm(invites, TABLE, alice, bob);
      expect(await invites.isInvited(TABLE, alice.address)).to.equal(true);
      expect(await invites.isInvited(TABLE, bob.address)).to.equal(false);
    });

    it("turns away a wrong code, and the player still cannot read the code", async function () {
      const { alice, invites, code } = await withCode();
      await tryCode(invites, TABLE, alice, code + 1n);
      await expect(confirm(invites, TABLE, alice))
        .to.emit(invites, "CodeRejected")
        .withArgs(TABLE, alice.address);
      expect(await invites.isInvited(TABLE, alice.address)).to.equal(false);
      expect(await canRead(invites, TABLE, alice)).to.equal(false);
    });

    it("reveals only whether the guess was right, never the code or the guess", async function () {
      const { alice, invites, code } = await withCode();
      await tryCode(invites, TABLE, alice, code + 5n);
      const result = await revealAttempt(invites, TABLE, alice);
      expect(Object.values(result.clearValues)).to.deep.equal([false]);
      expect(await canPublicDecrypt(await invites.codeOf(TABLE))).to.equal(false);
    });

    it("clears the answer once used, so a wrong answer can't be sent twice", async function () {
      const { alice, invites, code } = await withCode();
      await tryCode(invites, TABLE, alice, code + 1n);
      const result = await revealAttempt(invites, TABLE, alice);
      await invites
        .connect(alice)
        .confirmCode(TABLE, alice.address, result.abiEncodedClearValues, result.decryptionProof);
      expect(await invites.attemptOf(TABLE, alice.address)).to.equal(ethers.ZeroHash);
      await expect(
        invites
          .connect(alice)
          .confirmCode(TABLE, alice.address, result.abiEncodedClearValues, result.decryptionProof)
      )
        .to.be.revertedWithCustomError(invites, "NoAttempt")
        .withArgs(TABLE, alice.address);
    });

    it("refuses an answer that was not proven for this attempt", async function () {
      const { alice, bob, invites, code } = await withCode();
      await tryCode(invites, TABLE, alice, code);
      await tryCode(invites, TABLE, bob, code + 1n);
      const bobs = await revealAttempt(invites, TABLE, bob);
      await refusedBecause(
        invites
          .connect(alice)
          .confirmCode(TABLE, alice.address, bobs.abiEncodedClearValues, bobs.decryptionProof),
        "KMSInvalidSigner"
      );
      expect(await invites.isInvited(TABLE, alice.address)).to.equal(false);
    });

    it("refuses a made-up answer", async function () {
      const { alice, invites, code } = await withCode();
      await tryCode(invites, TABLE, alice, code + 1n);
      const real = await revealAttempt(invites, TABLE, alice);
      const forged = ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]);
      await refusedBecause(
        invites.connect(alice).confirmCode(TABLE, alice.address, forged, real.decryptionProof),
        "KMSInvalidSigner"
      );
      expect(await invites.isInvited(TABLE, alice.address)).to.equal(false);
    });

    it("replaces an earlier try, whose answer then no longer counts", async function () {
      const { alice, invites, code } = await withCode();
      await tryCode(invites, TABLE, alice, code + 1n);
      const first = await revealAttempt(invites, TABLE, alice);
      await tryCode(invites, TABLE, alice, code);
      await refusedBecause(
        invites
          .connect(alice)
          .confirmCode(TABLE, alice.address, first.abiEncodedClearValues, first.decryptionProof),
        "KMSInvalidSigner"
      );
      await confirm(invites, TABLE, alice);
      expect(await invites.isInvited(TABLE, alice.address)).to.equal(true);
    });

    it("needs an attempt before an answer", async function () {
      const { alice, invites } = await withCode();
      await expect(invites.connect(alice).confirmCode(TABLE, alice.address, "0x", "0x"))
        .to.be.revertedWithCustomError(invites, "NoAttempt")
        .withArgs(TABLE, alice.address);
    });

    it("allows 3 tries per table, then refuses", async function () {
      const { alice, invites, code } = await withCode();
      for (let tries = 1; tries <= 3; tries++) {
        await tryCode(invites, TABLE, alice, code + BigInt(tries));
        await confirm(invites, TABLE, alice);
      }
      await expect(tryCode(invites, TABLE, alice, code))
        .to.be.revertedWithCustomError(invites, "TooManyTries")
        .withArgs(TABLE);
      expect(await invites.triesOf(TABLE, alice.address)).to.equal(3);
    });

    it("counts tries for each table and player apart", async function () {
      const { game, host, alice, bob, invites, code } = await withCode();
      await invites.connect(game).newCode(OTHER_TABLE, host.address);
      for (let tries = 1; tries <= 3; tries++) {
        await tryCode(invites, TABLE, alice, code + BigInt(tries));
      }
      await expect(tryCode(invites, TABLE, bob, code)).to.emit(invites, "CodeTried");
      await expect(tryCode(invites, OTHER_TABLE, alice, code)).to.emit(invites, "CodeTried");
    });

    it("has nothing to prove for a player already invited", async function () {
      const { host, invites, code } = await withCode();
      await expect(tryCode(invites, TABLE, host, code))
        .to.be.revertedWithCustomError(invites, "AlreadyInvited")
        .withArgs(TABLE);
    });

    it("refuses tries at a table with no code", async function () {
      const { alice, invites } = await withCode();
      await expect(tryCode(invites, OTHER_TABLE, alice, 1n))
        .to.be.revertedWithCustomError(invites, "NoCode")
        .withArgs(OTHER_TABLE);
    });

    it("refuses a code encrypted by someone else", async function () {
      const { alice, bob, invites, code } = await withCode();
      const input = await fhevm
        .createEncryptedInput(await invites.getAddress(), alice.address)
        .add64(code)
        .encrypt();
      await refusedBecause(
        invites.connect(bob).tryCode(TABLE, input.handles[0], input.inputProof),
        "InvalidSigner"
      );
      expect(await invites.triesOf(TABLE, bob.address)).to.equal(0);
    });
  });

  describe("pausing", function () {
    it("stops tries and answers while paused, for the owner only", async function () {
      const { owner, alice, invites, code } = await withCode();
      await tryCode(invites, TABLE, alice, code);
      await expect(invites.connect(alice).pause())
        .to.be.revertedWithCustomError(invites, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
      await invites.connect(owner).pause();
      await expect(tryCode(invites, TABLE, alice, code)).to.be.revertedWithCustomError(
        invites,
        "EnforcedPause"
      );
      await expect(confirm(invites, TABLE, alice)).to.be.revertedWithCustomError(
        invites,
        "EnforcedPause"
      );
      await expect(invites.connect(alice).unpause())
        .to.be.revertedWithCustomError(invites, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
      await invites.connect(owner).unpause();
      await confirm(invites, TABLE, alice);
      expect(await invites.isInvited(TABLE, alice.address)).to.equal(true);
    });
  });

  describe("upgrading", function () {
    it("lets only the owner upgrade, to a real implementation, keeping codes", async function () {
      const { owner, alice, invites } = await withCode();
      const handle = await invites.codeOf(TABLE);
      const asAlice = (await ethers.getContractFactory("BluffInvites")).connect(alice);
      await expect(
        upgrades.upgradeProxy(await invites.getAddress(), asAlice, { kind: "uups" })
      ).to.be.revertedWithCustomError(invites, "OwnableUnauthorizedAccount");
      await expect(
        invites.connect(owner).upgradeToAndCall(ethers.ZeroAddress, "0x")
      ).to.be.revertedWithCustomError(invites, "ZeroAddress");
      const upgraded = await upgrades.upgradeProxy(
        await invites.getAddress(),
        (await ethers.getContractFactory("BluffInvites")).connect(owner),
        { kind: "uups" }
      );
      expect(await upgraded.codeOf(TABLE)).to.equal(handle);
    });
  });
});
