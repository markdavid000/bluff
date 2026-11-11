import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { fhevm } from "hardhat";
import type { Bluff } from "../../types";

export async function decryptDice(
  bluff: Bluff,
  tableId: bigint,
  owner: HardhatEthersSigner,
  reader: HardhatEthersSigner = owner
): Promise<bigint[]> {
  const handles = await bluff.diceOf(tableId, owner.address);
  const address = await bluff.getAddress();
  const values: bigint[] = [];
  for (const handle of handles) {
    values.push(await fhevm.userDecryptEuint(FhevmType.euint8, handle, address, reader));
  }
  return values;
}
