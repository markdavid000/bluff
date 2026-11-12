import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployGameFixture } from "../fixtures";
import { CHIP, chipBalance } from "../helpers/chips";

const IMAGE = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

describe("avatars", function () {
  it("saves a name and a face and gives 100 chips in one move", async function () {
    const { alice, chips, faucet } = await deployGameFixture();
    await expect(faucet.connect(alice).claimWithAvatar("Brave Otter", 7))
      .to.emit(faucet, "ChipsClaimed")
      .and.to.emit(faucet, "NicknameSet")
      .withArgs(alice.address, "Brave Otter")
      .and.to.emit(faucet, "AvatarSet")
      .withArgs(alice.address, 7, "");
    expect(await chipBalance(chips, alice)).to.equal(100n * CHIP);
    expect(await faucet.nicknameOf(alice.address)).to.equal("Brave Otter");
    expect(await faucet.avatarOf(alice.address)).to.deep.equal([7n, ""]);
  });

  it("keeps the daily limit when claiming with a face", async function () {
    const { alice, faucet } = await deployGameFixture();
    await faucet.connect(alice).claimWithAvatar("Brave Otter", 1);
    const next = await faucet.nextClaimAt(alice.address);
    await expect(faucet.connect(alice).claimWithAvatar("Brave Otter", 2))
      .to.be.revertedWithCustomError(faucet, "ClaimTooSoon")
      .withArgs(next);
    expect(await faucet.avatarOf(alice.address)).to.deep.equal([1n, ""]);
    await time.increaseTo(next);
    await faucet.connect(alice).claimWithAvatar("", 2);
    expect(await faucet.avatarOf(alice.address)).to.deep.equal([2n, ""]);
    expect(await faucet.nicknameOf(alice.address)).to.equal("Brave Otter");
  });

  it("starts with no face chosen", async function () {
    const { alice, faucet } = await deployGameFixture();
    expect(await faucet.avatarOf(alice.address)).to.deep.equal([0n, ""]);
  });

  it("changes the face on its own, and accepts every face from 1 to 12", async function () {
    const { alice, faucet } = await deployGameFixture();
    for (let avatar = 1; avatar <= 12; avatar++) {
      await expect(faucet.connect(alice).setAvatar(avatar))
        .to.emit(faucet, "AvatarSet")
        .withArgs(alice.address, avatar, "");
    }
    expect(await faucet.avatarOf(alice.address)).to.deep.equal([12n, ""]);
  });

  it("rejects a face that does not exist", async function () {
    const { alice, faucet } = await deployGameFixture();
    for (const avatar of [0, 13, 255]) {
      await expect(faucet.connect(alice).setAvatar(avatar))
        .to.be.revertedWithCustomError(faucet, "InvalidAvatar")
        .withArgs(avatar);
      await expect(faucet.connect(alice).claimWithAvatar("Brave Otter", avatar))
        .to.be.revertedWithCustomError(faucet, "InvalidAvatar")
        .withArgs(avatar);
    }
  });

  it("rejects an invalid name in the one-move claim", async function () {
    const { alice, faucet } = await deployGameFixture();
    await expect(faucet.connect(alice).claimWithAvatar("no", 3)).to.be.revertedWithCustomError(
      faucet,
      "InvalidNickname"
    );
  });

  it("saves an uploaded picture and clears the preset, and the other way round", async function () {
    const { alice, faucet } = await deployGameFixture();
    await faucet.connect(alice).setAvatar(4);
    await expect(faucet.connect(alice).setAvatarImage(IMAGE))
      .to.emit(faucet, "AvatarSet")
      .withArgs(alice.address, 0, IMAGE);
    expect(await faucet.avatarOf(alice.address)).to.deep.equal([0n, IMAGE]);
    await faucet.connect(alice).setAvatar(5);
    expect(await faucet.avatarOf(alice.address)).to.deep.equal([5n, ""]);
  });

  it("rejects an empty, overlong or malformed picture address", async function () {
    const { alice, faucet } = await deployGameFixture();
    for (const image of ["", "a".repeat(101), "bafy/../evil", "bafy evil", "javascript:x"]) {
      await expect(faucet.connect(alice).setAvatarImage(image)).to.be.revertedWithCustomError(
        faucet,
        "InvalidAvatarImage"
      );
    }
  });

  it("lets players change their face while the faucet is paused, but not claim", async function () {
    const { owner, alice, faucet } = await deployGameFixture();
    await faucet.connect(owner).pause();
    await expect(faucet.connect(alice).setAvatar(6)).not.to.be.reverted;
    await expect(faucet.connect(alice).setAvatarImage(IMAGE)).not.to.be.reverted;
    await expect(
      faucet.connect(alice).claimWithAvatar("Brave Otter", 6)
    ).to.be.revertedWithCustomError(faucet, "EnforcedPause");
  });

  it("keeps each player's face separate", async function () {
    const { alice, bob, faucet } = await deployGameFixture();
    await faucet.connect(alice).setAvatar(3);
    await faucet.connect(bob).setAvatar(9);
    expect(await faucet.avatarOf(alice.address)).to.deep.equal([3n, ""]);
    expect(await faucet.avatarOf(bob.address)).to.deep.equal([9n, ""]);
  });

  it("reports version 1.1.0", async function () {
    const { faucet } = await deployGameFixture();
    expect(await faucet.version()).to.equal("1.1.0");
  });
});
