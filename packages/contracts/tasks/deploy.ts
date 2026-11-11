import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { CHIP_ADDRESSES, type ChipAddresses } from "../config/networks";
import { type DeploymentRecord, type ProxyRecord, writeDeployment } from "./deployments";

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

async function deployProxy(
  hre: HardhatRuntimeEnvironment,
  name: "Bluff" | "ChipFaucet",
  args: unknown[]
): Promise<ProxyRecord> {
  const proxy = await hre.upgrades.deployProxy(await hre.ethers.getContractFactory(name), args, {
    kind: "uups",
  });
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const contract = await hre.ethers.getContractAt(name, proxyAddress);
  return {
    proxy: proxyAddress,
    implementation: await hre.upgrades.erc1967.getImplementationAddress(proxyAddress),
    version: await contract.version(),
  };
}

async function verifyImplementation(hre: HardhatRuntimeEnvironment, address: string) {
  await hre.run("verify:verify", { address, constructorArguments: [] });
}

task("deploy", "Deploys Bluff and ChipFaucet behind UUPS proxies").setAction(async (_args, hre) => {
  const [deployer] = await hre.ethers.getSigners();
  const { chips, dollars } = await resolveChipAddresses(hre);
  const bluff = await deployProxy(hre, "Bluff", [deployer.address, chips]);
  const faucet = await deployProxy(hre, "ChipFaucet", [deployer.address, chips, dollars]);

  const record: DeploymentRecord = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    chips,
    dollars,
    contracts: { Bluff: bluff, ChipFaucet: faucet },
  };
  const file = writeDeployment(record);
  console.log(`Bluff proxy ${bluff.proxy}, implementation ${bluff.implementation}`);
  console.log(`ChipFaucet proxy ${faucet.proxy}, implementation ${faucet.implementation}`);
  console.log(`Recorded in ${file}`);

  if (hre.network.name === "sepolia") {
    await verifyImplementation(hre, bluff.implementation);
    await verifyImplementation(hre, faucet.implementation);
  }
});
