import { task } from "hardhat/config";
import { PROXY_NAMES, readDeployment, recordedProxy } from "./deployments";

task(
  "validate-layout",
  "Checks the current source can safely upgrade every deployed proxy"
).setAction(async (_args, hre) => {
  const record = readDeployment(hre.network.name);
  for (const name of PROXY_NAMES) {
    const deployed = recordedProxy(record, name);
    const factory = await hre.ethers.getContractFactory(name);
    await hre.upgrades.validateUpgrade(deployed.proxy, factory, { kind: "uups" });
    console.log(`${name}: the current source is a safe upgrade of ${deployed.implementation}`);
  }
});
