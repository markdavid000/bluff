import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployGameFixture } from "../fixtures";
import { writeNicknameBeforeReservations } from "../helpers/nicknames";

const DAY = 24 * 60 * 60;

describe("unique nicknames", function () {
  it("refuses a nickname someone else holds, whatever its letter case", async function () {
    const { alice, bob, faucet } = await deployGameFixture();
    await faucet.connect(alice).setNickname("Maki");
    await expect(faucet.connect(bob).setNickname("Maki")).to.be.revertedWithCustomError(
      faucet,
      "NicknameTaken"
    );
    await expect(faucet.connect(bob).setNickname("mAKI")).to.be.revertedWithCustomError(
      faucet,
      "NicknameTaken"
    );
    expect(await faucet.nicknameOf(bob.address)).to.equal("");
  });

  it("enforces it on every way to set a nickname, and gives no chips when refused", async function () {
    const { alice, bob, faucet } = await deployGameFixture();
    await faucet.connect(alice).claim("Maki");
    await expect(faucet.connect(bob).claim("maki")).to.be.revertedWithCustomError(
      faucet,
      "NicknameTaken"
    );
    await expect(faucet.connect(bob).claimWithAvatar("MAKI", 1)).to.be.revertedWithCustomError(
      faucet,
      "NicknameTaken"
    );
    expect(await faucet.nextClaimAt(bob.address)).to.equal(0n);
  });

  it("treats names that differ by more than letter case as different", async function () {
    const { alice, bob, faucet } = await deployGameFixture();
    await faucet.connect(alice).setNickname("Maki 1");
    await expect(faucet.connect(bob).setNickname("Maki_1"))
      .to.emit(faucet, "NicknameSet")
      .withArgs(bob.address, "Maki_1");
  });

  it("lets a player set their own nickname again, or change its case", async function () {
    const { alice, faucet } = await deployGameFixture();
    await faucet.connect(alice).setNickname("Maki");
    await expect(faucet.connect(alice).setNickname("Maki")).to.emit(faucet, "NicknameSet");
    await expect(faucet.connect(alice).setNickname("MAKI"))
      .to.emit(faucet, "NicknameSet")
      .withArgs(alice.address, "MAKI");
    await time.increase(DAY);
    await expect(faucet.connect(alice).claim("maki")).to.emit(faucet, "NicknameSet");
  });

  it("frees the old nickname when a player changes it", async function () {
    const { alice, bob, faucet } = await deployGameFixture();
    await faucet.connect(alice).setNickname("Maki");
    await faucet.connect(alice).setNickname("Ada");
    await expect(faucet.connect(bob).setNickname("maki"))
      .to.emit(faucet, "NicknameSet")
      .withArgs(bob.address, "maki");
    await expect(faucet.connect(bob).setNickname("Ada")).to.be.revertedWithCustomError(
      faucet,
      "NicknameTaken"
    );
  });

  it("says whether a nickname is taken by someone other than the asker", async function () {
    const { alice, bob, faucet } = await deployGameFixture();
    expect(await faucet.isNicknameTaken("Maki", bob.address)).to.equal(false);
    await faucet.connect(alice).setNickname("Maki");
    expect(await faucet.isNicknameTaken("maki", bob.address)).to.equal(true);
    expect(await faucet.isNicknameTaken("MAKI", alice.address)).to.equal(false);
  });

  describe("reserving nicknames set before this rule", function () {
    it("reserves each listed player's nickname, first holder first, skipping duplicates", async function () {
      const { owner, alice, bob, carol, faucet } = await deployGameFixture();
      await writeNicknameBeforeReservations(faucet, alice.address, "Maki");
      await writeNicknameBeforeReservations(faucet, bob.address, "maki");
      await writeNicknameBeforeReservations(faucet, carol.address, "Kola");
      expect(await faucet.nicknameOf(alice.address)).to.equal("Maki");
      expect(await faucet.isNicknameTaken("Maki", carol.address)).to.equal(false);

      await expect(
        faucet.connect(owner).reserveExistingNicknames([alice.address, bob.address, carol.address])
      )
        .to.emit(faucet, "NicknameReserved")
        .withArgs(alice.address, "Maki")
        .and.to.emit(faucet, "NicknameReserved")
        .withArgs(carol.address, "Kola");

      expect(await faucet.isNicknameTaken("MAKI", carol.address)).to.equal(true);
      expect(await faucet.isNicknameTaken("maki", alice.address)).to.equal(false);
      expect(await faucet.isNicknameTaken("kola", alice.address)).to.equal(true);
      expect(await faucet.nicknameOf(bob.address)).to.equal("maki");
    });

    it("lets a skipped duplicate keep their nickname until they choose a free one", async function () {
      const { owner, alice, bob, faucet } = await deployGameFixture();
      await writeNicknameBeforeReservations(faucet, alice.address, "Maki");
      await writeNicknameBeforeReservations(faucet, bob.address, "Maki");
      await faucet.connect(owner).reserveExistingNicknames([alice.address, bob.address]);
      expect(await faucet.nicknameOf(bob.address)).to.equal("Maki");
      await expect(faucet.connect(bob).setNickname("Maki")).to.be.revertedWithCustomError(
        faucet,
        "NicknameTaken"
      );
      await faucet.connect(bob).setNickname("Ada");
      expect(await faucet.isNicknameTaken("maki", bob.address)).to.equal(true);
    });

    it("leaves names already reserved alone when run again", async function () {
      const { owner, alice, faucet } = await deployGameFixture();
      await faucet.connect(alice).setNickname("Maki");
      await expect(faucet.connect(owner).reserveExistingNicknames([alice.address])).not.to.emit(
        faucet,
        "NicknameReserved"
      );
    });

    it("skips players with no nickname", async function () {
      const { owner, alice, faucet } = await deployGameFixture();
      await expect(faucet.connect(owner).reserveExistingNicknames([alice.address])).not.to.emit(
        faucet,
        "NicknameReserved"
      );
    });

    it("can be run only by the owner", async function () {
      const { alice, faucet } = await deployGameFixture();
      await expect(
        faucet.connect(alice).reserveExistingNicknames([alice.address])
      ).to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount");
    });
  });
});
