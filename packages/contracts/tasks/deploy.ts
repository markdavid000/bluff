import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { CHIP_ADDRESSES, type ChipAddresses } from "../config/networks";
import { type DeploymentRecord, writeDeployment } from "./deployments";
import { deployProxy } from "./chain";
import { deployInvites, linkInvites } from "./invites";
import { verifyImplementation } from "./verify";

async function resolveChipAddresses(hre: HardhatRuntimeEnvironment): Promise<ChipAddresses> {
  const known = CHIP_ADDRESSES[hre.network.name];
  if (known) return known;
  const dollars = await hre.ethers.deployContract("MockUSDT");
  await dollars.waitForDeployment();
  const chips = await hre.ethers.deployContract("MockConfidentialUSDT", [
    await dollars.getAddress(),
  ]);
  await chips.waitForDeployment();
  return { chips: await chips.getAddress(), dollars: await dollars.getAddress() };
}

task(
  "deploy",
  "Deploys Bluff, BluffCashier, BluffInvites and ChipFaucet behind UUPS proxies"
).setAction(async (_args, hre) => {
  const [deployer] = await hre.ethers.getSigners();
  const { chips, dollars } = await resolveChipAddresses(hre);
  const bluff = await deployProxy(hre, "Bluff", [deployer.address]);
  const cashier = await deployProxy(hre, "BluffCashier", [deployer.address, chips, bluff.proxy]);
  const game = await hre.ethers.getContractAt("Bluff", bluff.proxy);
  await (await game.setCashier(cashier.proxy)).wait();
  const faucet = await deployProxy(hre, "ChipFaucet", [deployer.address, chips, dollars]);
  const invites = await deployInvites(hre, deployer.address, bluff.proxy);
  await linkInvites(hre, bluff.proxy, invites.proxy);

  const record: DeploymentRecord = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    chips,
    dollars,
    contracts: { Bluff: bluff, BluffCashier: cashier, BluffInvites: invites, ChipFaucet: faucet },
  };
  const file = writeDeployment(record);
  console.log(`Bluff proxy ${bluff.proxy}, implementation ${bluff.implementation}`);
  console.log(`BluffCashier proxy ${cashier.proxy}, implementation ${cashier.implementation}`);
  console.log(`BluffInvites proxy ${invites.proxy}, implementation ${invites.implementation}`);
  console.log(`ChipFaucet proxy ${faucet.proxy}, implementation ${faucet.implementation}`);
  console.log(`Recorded in ${file}`);

  if (hre.network.name === "sepolia") {
    await verifyImplementation(hre, "Bluff", bluff.implementation);
    await verifyImplementation(hre, "BluffCashier", cashier.implementation);
    await verifyImplementation(hre, "BluffInvites", invites.implementation);
    await verifyImplementation(hre, "ChipFaucet", faucet.implementation);
  }
});
