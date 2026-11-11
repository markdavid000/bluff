import { ethers, upgrades } from "hardhat";
import type { Bluff, ChipFaucet, MockConfidentialUSDT, MockUSDT, RulesHarness } from "../types";

export async function deployRulesFixture(): Promise<{ rules: RulesHarness }> {
  const rules = await ethers.deployContract("RulesHarness");
  await rules.waitForDeployment();
  return { rules };
}

export async function deployGameFixture() {
  const [owner, alice, bob, carol] = await ethers.getSigners();

  const dollars = (await ethers.deployContract("MockUSDT")) as unknown as MockUSDT;
  const chips = (await ethers.deployContract("MockConfidentialUSDT", [
    await dollars.getAddress(),
  ])) as unknown as MockConfidentialUSDT;

  const bluff = (await upgrades.deployProxy(
    await ethers.getContractFactory("Bluff"),
    [owner.address, await chips.getAddress()],
    { kind: "uups" }
  )) as unknown as Bluff;

  const faucet = (await upgrades.deployProxy(
    await ethers.getContractFactory("ChipFaucet"),
    [owner.address, await chips.getAddress(), await dollars.getAddress()],
    { kind: "uups" }
  )) as unknown as ChipFaucet;

  return { owner, alice, bob, carol, dollars, chips, bluff, faucet };
}
