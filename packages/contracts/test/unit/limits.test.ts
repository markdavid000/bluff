import { expect } from "chai";
import { artifacts, ethers } from "hardhat";

const SIZE_LIMIT = 24_576;
const BLUFF_HEADROOM = 256;
const HCU_LIMIT_EXCEEDED = "0x77e3c293";
const HCU_DEPTH_LIMIT_EXCEEDED = "0xfc344870";

async function deployedSize(name: string): Promise<number> {
  const artifact = await artifacts.readArtifact(name);
  return (artifact.deployedBytecode.length - 2) / 2;
}

async function revertData(action: Promise<unknown>): Promise<string> {
  const error = await action.then(
    () => undefined,
    (reason: unknown) => reason as { data?: string; message: string }
  );
  if (!error) return "";
  return error.data ?? (error.message.match(/0x[0-9a-f]{8}/i) ?? [""])[0];
}

describe("limits", function () {
  it("keeps every contract under the size limit, with room left in Bluff", async function () {
    if (process.env.SOLIDITY_COVERAGE === "true") this.skip();
    expect(await deployedSize("Bluff")).to.be.at.most(SIZE_LIMIT - BLUFF_HEADROOM);
    for (const name of ["BluffCashier", "BluffInvites", "ChipFaucet"]) {
      expect(await deployedSize(name)).to.be.below(SIZE_LIMIT);
    }
  });

  it("runs on a mock that enforces Zama's encryption depth limit", async function () {
    const burner = await ethers.deployContract("HcuBurnerMock");
    await expect(burner.burnDeep(8)).not.to.be.reverted;
    expect(await revertData(burner.burnDeep.staticCall(16))).to.equal(HCU_DEPTH_LIMIT_EXCEEDED);
  });

  it("runs on a mock that enforces Zama's encryption total limit", async function () {
    const burner = await ethers.deployContract("HcuBurnerMock");
    await expect(burner.burnWide(8)).not.to.be.reverted;
    expect(await revertData(burner.burnWide.staticCall(40))).to.equal(HCU_LIMIT_EXCEEDED);
  });
});
