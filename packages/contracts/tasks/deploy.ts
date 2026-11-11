import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { CHIP_ADDRESSES, type ChipAddresses } from "../config/networks";
import { type DeploymentRecord, type ProxyRecord, writeDeployment } from "./deployments";
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

const CONFIRMATIONS = 2;
const READ_ATTEMPTS = 10;
const READ_DELAY_MS = 3_000;

function isLocal(hre: HardhatRuntimeEnvironment): boolean {
  return hre.network.config.chainId === 31337;
}

async function implementationOf(hre: HardhatRuntimeEnvironment, proxy: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await hre.upgrades.erc1967.getImplementationAddress(proxy);
    } catch (error) {
      if (attempt === READ_ATTEMPTS || isLocal(hre)) throw error;
      await new Promise((resolve) => setTimeout(resolve, READ_DELAY_MS));
    }
  }
}

async function deployProxy(
  hre: HardhatRuntimeEnvironment,
  name: "Bluff" | "BluffCashier" | "ChipFaucet",
  args: unknown[]
): Promise<ProxyRecord> {
  const proxy = await hre.upgrades.deployProxy(await hre.ethers.getContractFactory(name), args, {
    kind: "uups",
  });
  await proxy.waitForDeployment();
  await proxy.deploymentTransaction()?.wait(isLocal(hre) ? 1 : CONFIRMATIONS);
  const proxyAddress = await proxy.getAddress();
  const contract = await hre.ethers.getContractAt(name, proxyAddress);
  return {
    proxy: proxyAddress,
    implementation: await implementationOf(hre, proxyAddress),
    version: await contract.version(),
  };
}

task("deploy", "Deploys Bluff, BluffCashier and ChipFaucet behind UUPS proxies").setAction(
  async (_args, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const { chips, dollars } = await resolveChipAddresses(hre);
    const bluff = await deployProxy(hre, "Bluff", [deployer.address]);
    const cashier = await deployProxy(hre, "BluffCashier", [deployer.address, chips, bluff.proxy]);
    const game = await hre.ethers.getContractAt("Bluff", bluff.proxy);
    await (await game.setCashier(cashier.proxy)).wait();
    const faucet = await deployProxy(hre, "ChipFaucet", [deployer.address, chips, dollars]);

    const record: DeploymentRecord = {
      network: hre.network.name,
      chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      chips,
      dollars,
      contracts: { Bluff: bluff, BluffCashier: cashier, ChipFaucet: faucet },
    };
    const file = writeDeployment(record);
    console.log(`Bluff proxy ${bluff.proxy}, implementation ${bluff.implementation}`);
    console.log(`BluffCashier proxy ${cashier.proxy}, implementation ${cashier.implementation}`);
    console.log(`ChipFaucet proxy ${faucet.proxy}, implementation ${faucet.implementation}`);
    console.log(`Recorded in ${file}`);

    if (hre.network.name === "sepolia") {
      await verifyImplementation(hre, "Bluff", bluff.implementation);
      await verifyImplementation(hre, "BluffCashier", cashier.implementation);
      await verifyImplementation(hre, "ChipFaucet", faucet.implementation);
    }
  }
);
