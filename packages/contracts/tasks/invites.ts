import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployProxy } from "./chain";
import { type ProxyRecord, readDeployment, recordedProxy, writeDeployment } from "./deployments";
import { verifyImplementation } from "./verify";

export async function deployInvites(
  hre: HardhatRuntimeEnvironment,
  owner: string,
  bluff: string
): Promise<ProxyRecord> {
  return deployProxy(hre, "BluffInvites", [owner, bluff]);
}

export async function linkInvites(hre: HardhatRuntimeEnvironment, bluff: string, invites: string) {
  const game = await hre.ethers.getContractAt("Bluff", bluff);
  await (await game.setInvites(invites)).wait(hre.network.config.chainId === 31337 ? 1 : 2);
  const linked = await game.invites();
  if (linked.toLowerCase() !== invites.toLowerCase()) {
    throw new Error(`Bluff links to ${linked}, not ${invites}.`);
  }
}

task("deploy-invites", "Deploys BluffInvites beside a recorded Bluff and records it").setAction(
  async (_args, hre) => {
    const record = readDeployment(hre.network.name);
    const existing = record.contracts.BluffInvites;
    if (existing) {
      throw new Error(`BluffInvites is already recorded at ${existing.proxy}.`);
    }
    const [deployer] = await hre.ethers.getSigners();
    const invites = await deployInvites(hre, deployer.address, record.contracts.Bluff.proxy);
    record.contracts.BluffInvites = invites;
    writeDeployment(record);
    console.log(`BluffInvites proxy ${invites.proxy}, implementation ${invites.implementation}`);
    if (hre.network.name === "sepolia") {
      await verifyImplementation(hre, "BluffInvites", invites.implementation);
    }
  }
);

task("link-invites", "Links the recorded Bluff to the recorded BluffInvites").setAction(
  async (_args, hre) => {
    const record = readDeployment(hre.network.name);
    const invites = recordedProxy(record, "BluffInvites");
    await linkInvites(hre, record.contracts.Bluff.proxy, invites.proxy);
    console.log(`Bluff now links to BluffInvites at ${invites.proxy}`);
  }
);
