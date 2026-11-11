import { vars } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { ProxyName } from "./deployments";

export async function verifyImplementation(
  hre: HardhatRuntimeEnvironment,
  name: ProxyName,
  address: string
) {
  if (!vars.has("ETHERSCAN_API_KEY")) {
    console.log(`Skipped Etherscan verification of ${address}: set ETHERSCAN_API_KEY to verify.`);
    return;
  }
  await hre.run("verify:verify", {
    address,
    contract: `contracts/${name}.sol:${name}`,
    constructorArguments: [],
  });
}
