import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { AbiCoder, ZeroHash } from "ethers";
import { fhevm } from "hardhat";
import type { Bluff, BluffCashier, ChipFaucet, MockConfidentialUSDT } from "../../types";

export const CHIP = 1_000_000n;
export const CREATE = 0;
export const JOIN = 1;

export async function claimChips(faucet: ChipFaucet, player: HardhatEthersSigner, nickname = "") {
  await (await faucet.connect(player).claim(nickname)).wait();
}

export async function chipBalance(
  chips: MockConfidentialUSDT,
  player: HardhatEthersSigner
): Promise<bigint> {
  const handle = await chips.confidentialBalanceOf(player.address);
  if (handle === ZeroHash) return 0n;
  return fhevm.userDecryptEuint(FhevmType.euint64, handle, await chips.getAddress(), player);
}

export function joinData(
  action: number,
  tableId: bigint,
  seatCount: number,
  buyIn: bigint,
  isPrivate: boolean
): string {
  return AbiCoder.defaultAbiCoder().encode(
    ["uint8", "uint256", "uint8", "uint64", "bool"],
    [action, tableId, seatCount, buyIn, isPrivate]
  );
}

export async function payAndCall(
  chips: MockConfidentialUSDT,
  cashier: BluffCashier,
  player: HardhatEthersSigner,
  amount: bigint,
  data: string
) {
  const input = await fhevm
    .createEncryptedInput(await chips.getAddress(), player.address)
    .add64(amount)
    .encrypt();
  return chips
    .connect(player)
    ["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
      await cashier.getAddress(),
      input.handles[0],
      input.inputProof,
      data
    );
}

export async function payToCreate(
  chips: MockConfidentialUSDT,
  cashier: BluffCashier,
  player: HardhatEthersSigner,
  seatCount: number,
  buyIn: bigint,
  amount: bigint = buyIn
) {
  return payAndCall(chips, cashier, player, amount, joinData(CREATE, 0n, seatCount, buyIn, false));
}

export async function payToJoin(
  chips: MockConfidentialUSDT,
  cashier: BluffCashier,
  player: HardhatEthersSigner,
  id: bigint,
  amount: bigint
) {
  return payAndCall(chips, cashier, player, amount, joinData(JOIN, id, 0, 0n, false));
}

export async function confirmSeats(bluff: Bluff, id: bigint, settler: HardhatEthersSigner) {
  const handles = await bluff.revealHandles(id);
  const result = await fhevm.publicDecrypt([...handles]);
  return bluff
    .connect(settler)
    .confirmSeats(id, result.abiEncodedClearValues, result.decryptionProof);
}

export async function seatPaidTable(
  contracts: {
    chips: MockConfidentialUSDT;
    cashier: BluffCashier;
    bluff: Bluff;
    faucet: ChipFaucet;
  },
  players: HardhatEthersSigner[],
  buyIn: bigint
): Promise<bigint> {
  const { chips, cashier, bluff, faucet } = contracts;
  for (const player of players) await claimChips(faucet, player);
  const [host, ...others] = players;
  await (await payToCreate(chips, cashier, host, players.length, buyIn)).wait();
  const id = await bluff.tableOf(host.address);
  for (const player of others) await (await payToJoin(chips, cashier, player, id, buyIn)).wait();
  return id;
}

export async function startPaidGame(
  contracts: {
    chips: MockConfidentialUSDT;
    cashier: BluffCashier;
    bluff: Bluff;
    faucet: ChipFaucet;
  },
  players: HardhatEthersSigner[],
  buyIn: bigint
): Promise<bigint> {
  const id = await seatPaidTable(contracts, players, buyIn);
  await (await confirmSeats(contracts.bluff, id, players[0])).wait();
  return id;
}
