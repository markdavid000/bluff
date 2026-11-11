import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { fhevm } from "hardhat";
import { deployGameFixture } from "../fixtures";
import { CHIP, chipBalance } from "../helpers/chips";

const DAY = 24 * 60 * 60;

describe("chip faucet", function () {
  it("gives exactly 100 chips and saves the nickname", async function () {
    const { alice, chips, faucet } = await deployGameFixture();
    await expect(faucet.connect(alice).claim("Brave Otter"))
      .to.emit(faucet, "ChipsClaimed")
      .and.to.emit(faucet, "NicknameSet")
      .withArgs(alice.address, "Brave Otter");
    expect(await chipBalance(chips, alice)).to.equal(100n * CHIP);
    expect(await faucet.nicknameOf(alice.address)).to.equal("Brave Otter");
    expect(await faucet.nextClaimAt(alice.address)).to.equal(BigInt((await time.latest()) + DAY));
  });

  it("allows one claim every 24 hours", async function () {
    const { alice, chips, faucet } = await deployGameFixture();
    await faucet.connect(alice).claim("");
    const next = await faucet.nextClaimAt(alice.address);
    await expect(faucet.connect(alice).claim(""))
      .to.be.revertedWithCustomError(faucet, "ClaimTooSoon")
      .withArgs(next);
    await time.increaseTo(next);
    await faucet.connect(alice).claim("");
    expect(await chipBalance(chips, alice)).to.equal(200n * CHIP);
  });

  it("keeps the nickname when a claim sends none", async function () {
    const { alice, faucet } = await deployGameFixture();
    await faucet.connect(alice).claim("Brave Otter");
    await time.increase(DAY);
    await expect(faucet.connect(alice).claim("")).not.to.emit(faucet, "NicknameSet");
    expect(await faucet.nicknameOf(alice.address)).to.equal("Brave Otter");
  });

  it("refuses an invalid nickname and gives no chips", async function () {
    const { alice, chips, faucet } = await deployGameFixture();
    await expect(faucet.connect(alice).claim("<b>x</b>")).to.be.revertedWithCustomError(
      faucet,
      "InvalidNickname"
    );
    expect(await chipBalance(chips, alice)).to.equal(0n);
    expect(await faucet.nextClaimAt(alice.address)).to.equal(0n);
  });

  it("lets players change their nickname, even while paused", async function () {
    const { owner, alice, faucet } = await deployGameFixture();
    await faucet.connect(owner).pause();
    await expect(faucet.connect(alice).setNickname("Calm Heron"))
      .to.emit(faucet, "NicknameSet")
      .withArgs(alice.address, "Calm Heron");
    await expect(faucet.connect(alice).setNickname("x")).to.be.revertedWithCustomError(
      faucet,
      "InvalidNickname"
    );
  });

  it("stops claims while paused", async function () {
    const { owner, alice, faucet } = await deployGameFixture();
    await faucet.connect(owner).pause();
    await expect(faucet.connect(alice).claim("")).to.be.revertedWithCustomError(
      faucet,
      "EnforcedPause"
    );
  });

  it("keeps each balance private to its owner", async function () {
    const { alice, bob, chips, faucet } = await deployGameFixture();
    await faucet.connect(alice).claim("");
    let error: unknown;
    try {
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await chips.confidentialBalanceOf(alice.address),
        await chips.getAddress(),
        bob
      );
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(Error);
  });
});
