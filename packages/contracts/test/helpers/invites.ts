import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { fhevm } from "hardhat";
import type { BluffInvites } from "../../types";

export async function proveCode(
  invites: BluffInvites,
  id: bigint,
  host: HardhatEthersSigner,
  player: HardhatEthersSigner
) {
  const address = await invites.getAddress();
  const code = await fhevm.userDecryptEuint(
    FhevmType.euint64,
    await invites.codeOf(id),
    address,
    host
  );
  const input = await fhevm.createEncryptedInput(address, player.address).add64(code).encrypt();
  await (await invites.connect(player).tryCode(id, input.handles[0], input.inputProof)).wait();
  const result = await fhevm.publicDecrypt([await invites.attemptOf(id, player.address)]);
  await (
    await invites
      .connect(player)
      .confirmCode(id, player.address, result.abiEncodedClearValues, result.decryptionProof)
  ).wait();
}
