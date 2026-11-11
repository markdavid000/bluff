import { ethers, upgrades } from "hardhat";
import type {
  Bluff,
  BluffCashier,
  ChipFaucet,
  MockConfidentialUSDT,
  MockUSDT,
  RulesHarness,
} from "../types";

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
    [owner.address],
    { kind: "uups" }
  )) as unknown as Bluff;

  const cashier = (await upgrades.deployProxy(
    await ethers.getContractFactory("BluffCashier"),
    [owner.address, await chips.getAddress(), await bluff.getAddress()],
    { kind: "uups" }
  )) as unknown as BluffCashier;
  await (await bluff.connect(owner).setCashier(await cashier.getAddress())).wait();

  const faucet = (await upgrades.deployProxy(
    await ethers.getContractFactory("ChipFaucet"),
    [owner.address, await chips.getAddress(), await dollars.getAddress()],
    { kind: "uups" }
  )) as unknown as ChipFaucet;

  return { owner, alice, bob, carol, dollars, chips, bluff, cashier, faucet };
}
