import { expect } from "chai";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import hre from "hardhat";
import { readDeployment } from "../../tasks/deployments";

const RECORD = path.join(__dirname, "..", "..", "deployments", "hardhat.json");

async function expectFailure(action: Promise<unknown>, message: string): Promise<void> {
  const error = await action.then(
    () => undefined,
    (reason: unknown) => reason
  );
  expect(error).to.be.instanceOf(Error);
  expect((error as Error).message).to.contain(message);
}

describe("tasks", function () {
  afterEach(function () {
    rmSync(RECORD, { force: true });
  });

  it("deploys both proxies against mock chips and records them", async function () {
    await hre.run("deploy");
    expect(existsSync(RECORD)).to.equal(true);
    const record = readDeployment("hardhat");
    expect(record.chainId).to.equal(31337);
    for (const name of ["Bluff", "ChipFaucet"] as const) {
      const entry = record.contracts[name];
      expect(entry.version).to.equal("1.0.0");
      expect(await hre.upgrades.erc1967.getImplementationAddress(entry.proxy)).to.equal(
        entry.implementation
      );
    }
    const bluff = await hre.ethers.getContractAt("Bluff", record.contracts.Bluff.proxy);
    expect(await bluff.chips()).to.equal(record.chips);
  });

  it("upgrades a recorded proxy and keeps its address", async function () {
    await hre.run("deploy");
    const before = readDeployment("hardhat");
    await hre.run("upgrade", { contract: "Bluff" });
    const after = readDeployment("hardhat");
    expect(after.contracts.Bluff.proxy).to.equal(before.contracts.Bluff.proxy);
    expect(after.contracts.Bluff.version).to.equal("1.0.0");
  });

  it("refuses an unknown contract name", async function () {
    await hre.run("deploy");
    await expectFailure(hre.run("upgrade", { contract: "Nope" }), "Unknown contract Nope");
  });

  it("refuses to upgrade without a recorded deployment", async function () {
    await expectFailure(
      hre.run("upgrade", { contract: "Bluff" }),
      "No deployment recorded for hardhat"
    );
  });
});
