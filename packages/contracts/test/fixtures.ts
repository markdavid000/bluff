import { ethers } from "hardhat";
import type { RulesHarness } from "../types";

export async function deployRulesFixture(): Promise<{ rules: RulesHarness }> {
  const rules = await ethers.deployContract("RulesHarness");
  await rules.waitForDeployment();
  return { rules };
}
