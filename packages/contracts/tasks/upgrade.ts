import { task, types } from "hardhat/config";
import {
  PROXY_NAMES,
  type ProxyName,
  readDeployment,
  recordedProxy,
  writeDeployment,
} from "./deployments";
import { landedImplementation, versionAt } from "./chain";
import { verifyImplementation } from "./verify";

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
    const current = recordedProxy(record, contract);
    const factory = await hre.ethers.getContractFactory(contract);
    const prepared = await hre.upgrades.prepareUpgrade(current.proxy, factory, { kind: "uups" });
    if (typeof prepared !== "string") throw new Error("Expected the new implementation's address.");
    const implementation = hre.ethers.getAddress(prepared);
    const upgraded = await hre.upgrades.upgradeProxy(current.proxy, factory, { kind: "uups" });
    await upgraded.waitForDeployment();
    const block = await landedImplementation(hre, current.proxy, implementation);
    const upgradedRecord = {
      proxy: current.proxy,
      implementation,
      version: await versionAt(hre, contract, current.proxy, block),
    };
    record.contracts[contract] = upgradedRecord;
    writeDeployment(record);
    console.log(`${contract} ${current.version} -> ${upgradedRecord.version}`);
    console.log(`Implementation ${implementation}`);

    if (hre.network.name === "sepolia") {
      await verifyImplementation(hre, contract, implementation);
    }
  });
