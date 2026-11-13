import type { ContractTransactionResponse } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { ProxyName, ProxyRecord } from "./deployments";

const LIVE_CONFIRMATIONS = 2;
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function isLocal(hre: HardhatRuntimeEnvironment): boolean {
  return hre.network.config.chainId === 31337;
}

export async function confirmedBlock(
  hre: HardhatRuntimeEnvironment,
  transaction: ContractTransactionResponse | null | undefined
): Promise<number> {
  if (!transaction) throw new Error("Expected a transaction to wait for, but there was none.");
  const receipt = await transaction.wait(isLocal(hre) ? 1 : LIVE_CONFIRMATIONS);
  if (!receipt || receipt.status !== 1) throw new Error(`Transaction ${transaction.hash} failed.`);
  return receipt.blockNumber;
}

export async function implementationAt(
  hre: HardhatRuntimeEnvironment,
  proxy: string,
  blockTag: number
): Promise<string> {
  const slot = await hre.ethers.provider.getStorage(proxy, IMPLEMENTATION_SLOT, blockTag);
  return hre.ethers.getAddress(`0x${slot.slice(-40)}`);
}

export async function versionAt(
  hre: HardhatRuntimeEnvironment,
  name: ProxyName,
  proxy: string,
  blockTag: number
): Promise<string> {
  const contract = await hre.ethers.getContractAt(name, proxy);
  return contract.version({ blockTag });
}

const UPGRADE_CHECKS = 40;
const UPGRADE_CHECK_DELAY_MS = 3_000;

export async function landedImplementation(
  hre: HardhatRuntimeEnvironment,
  proxy: string,
  expected: string
): Promise<number> {
  for (let check = 1; check <= UPGRADE_CHECKS; check++) {
    const block = await hre.ethers.provider.getBlockNumber();
    const implementation = await implementationAt(hre, proxy, block);
    if (implementation.toLowerCase() === expected.toLowerCase()) return block;
    await new Promise((resolve) => setTimeout(resolve, UPGRADE_CHECK_DELAY_MS));
  }
  throw new Error(`${proxy} does not point at ${expected} yet; the upgrade did not land.`);
}

export async function deployProxy(
  hre: HardhatRuntimeEnvironment,
  name: ProxyName,
  args: unknown[]
): Promise<ProxyRecord> {
  const proxy = await hre.upgrades.deployProxy(await hre.ethers.getContractFactory(name), args, {
    kind: "uups",
  });
  await proxy.waitForDeployment();
  const block = await confirmedBlock(hre, proxy.deploymentTransaction());
  const proxyAddress = await proxy.getAddress();
  return {
    proxy: proxyAddress,
    implementation: await implementationAt(hre, proxyAddress, block),
    version: await versionAt(hre, name, proxyAddress, block),
  };
}
