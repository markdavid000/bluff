import { expect } from "chai";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import hre from "hardhat";
import { PUBLIC_TEST_ADDRESS, safeOwner } from "../../tasks/chain";
import { type DeploymentRecord, readDeployment, writeDeployment } from "../../tasks/deployments";

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

  it("deploys every proxy against mock chips, links them and records them", async function () {
    await hre.run("deploy");
    expect(existsSync(RECORD)).to.equal(true);
    const record = readDeployment("hardhat");
    expect(record.chainId).to.equal(31337);
    const versions = {
      Bluff: "1.3.0",
      BluffCashier: "1.1.0",
      BluffInvites: "1.0.0",
      ChipFaucet: "1.1.0",
    } as const;
    for (const name of ["Bluff", "BluffCashier", "BluffInvites", "ChipFaucet"] as const) {
      const entry = record.contracts[name];
      if (!entry) throw new Error(`${name} was not recorded.`);
      expect(entry.version).to.equal(versions[name]);
      expect(await hre.upgrades.erc1967.getImplementationAddress(entry.proxy)).to.equal(
        entry.implementation
      );
    }
    const bluff = await hre.ethers.getContractAt("Bluff", record.contracts.Bluff.proxy);
    expect(await bluff.cashier()).to.equal(record.contracts.BluffCashier.proxy);
    expect(await bluff.invites()).to.equal(record.contracts.BluffInvites?.proxy);
    const invites = await hre.ethers.getContractAt(
      "BluffInvites",
      record.contracts.BluffInvites?.proxy ?? ""
    );
    expect(await invites.bluff()).to.equal(record.contracts.Bluff.proxy);
    const cashier = await hre.ethers.getContractAt(
      "BluffCashier",
      record.contracts.BluffCashier.proxy
    );
    expect(await cashier.chips()).to.equal(record.chips);
    expect(await cashier.bluff()).to.equal(record.contracts.Bluff.proxy);
  });

  it("upgrades a recorded proxy and keeps its address", async function () {
    await hre.run("deploy");
    const before = readDeployment("hardhat");
    await hre.run("upgrade", { contract: "Bluff" });
    const after = readDeployment("hardhat");
    expect(after.contracts.Bluff.proxy).to.equal(before.contracts.Bluff.proxy);
    expect(after.contracts.Bluff.version).to.equal("1.3.0");
  });

  it("adds BluffInvites beside a deployed Bluff, then links them, once each", async function () {
    await hre.run("deploy");
    const full = readDeployment("hardhat");
    const [deployer] = await hre.ethers.getSigners();
    const unlinked = await hre.upgrades.deployProxy(
      await hre.ethers.getContractFactory("Bluff"),
      [deployer.address],
      { kind: "uups" }
    );
    const withoutInvites: DeploymentRecord = {
      ...full,
      contracts: {
        Bluff: { ...full.contracts.Bluff, proxy: await unlinked.getAddress() },
        BluffCashier: full.contracts.BluffCashier,
        ChipFaucet: full.contracts.ChipFaucet,
      },
    };
    writeDeployment(withoutInvites);
    await expectFailure(hre.run("link-invites"), "BluffInvites is not recorded on hardhat");

    await hre.run("deploy-invites");
    const recorded = readDeployment("hardhat").contracts.BluffInvites;
    if (!recorded) throw new Error("BluffInvites was not recorded.");
    expect(recorded.version).to.equal("1.0.0");
    const bluff = await hre.ethers.getContractAt("Bluff", await unlinked.getAddress());
    expect(await bluff.invites()).to.equal(hre.ethers.ZeroAddress);

    await hre.run("link-invites");
    expect(await bluff.invites()).to.equal(recorded.proxy);
    await expectFailure(hre.run("deploy-invites"), "BluffInvites is already recorded");
    const relink = await hre.run("link-invites").then(
      () => undefined,
      (error: { data?: string }) => error
    );
    expect(bluff.interface.parseError(relink?.data ?? "0x")?.name).to.equal("InvitesAlreadySet");
    expect(await bluff.invites()).to.equal(recorded.proxy);
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

  describe("the owner of live contracts", function () {
    const OWN = "0x00000000000000000000000000000000000a11ce";

    it("refuses a live network with no key of your own", function () {
      expect(() => safeOwner(undefined, "sepolia")).to.throw(/Set your own MNEMONIC/);
    });

    it("refuses the public test key on a live network", function () {
      expect(() => safeOwner(PUBLIC_TEST_ADDRESS, "sepolia")).to.throw(/public test key/);
    });

    it("accepts your own key on a live network, and the test key locally", function () {
      expect(safeOwner(OWN, "sepolia")).to.equal(OWN);
      expect(safeOwner(PUBLIC_TEST_ADDRESS, "hardhat")).to.equal(PUBLIC_TEST_ADDRESS);
    });
  });
});
