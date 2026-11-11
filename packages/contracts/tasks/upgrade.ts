import { task, types } from "hardhat/config";
import { type ProxyName, readDeployment, writeDeployment } from "./deployments";

const PROXY_NAMES: readonly ProxyName[] = ["Bluff", "BluffCashier", "ChipFaucet"];

function isProxyName(name: string): name is ProxyName {
  return (PROXY_NAMES as readonly string[]).includes(name);
}

task("upgrade", "Validates and upgrades one proxy to the current source")
  .addParam("contract", "Bluff, BluffCashier or ChipFaucet", undefined, types.string)
  .setAction(async ({ contract }: { contract: string }, hre) => {
    if (!isProxyName(contract)) {
      throw new Error(`Unknown contract ${contract}. Use one of: ${PROXY_NAMES.join(", ")}.`);
    }
    const record = readDeployment(hre.network.name);
    const current = record.contracts[contract];
    const factory = await hre.ethers.getContractFactory(contract);
    const upgraded = await hre.upgrades.upgradeProxy(current.proxy, factory, { kind: "uups" });
    await upgraded.waitForDeployment();
    const instance = await hre.ethers.getContractAt(contract, current.proxy);
    const implementation = await hre.upgrades.erc1967.getImplementationAddress(current.proxy);
    record.contracts[contract] = {
      proxy: current.proxy,
      implementation,
      version: await instance.version(),
    };
    writeDeployment(record);
    console.log(`${contract} ${current.version} -> ${record.contracts[contract].version}`);
    console.log(`Implementation ${implementation}`);

    if (hre.network.name === "sepolia") {
      await hre.run("verify:verify", { address: implementation, constructorArguments: [] });
    }
  });
