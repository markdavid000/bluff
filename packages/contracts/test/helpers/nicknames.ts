import { setStorageAt } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

const FAUCET_STORAGE = 0x0e050407d3d414cfacdc6be26afb1d6afead96e5025155e10212f610e9bebe00n;
const NICKNAMES_FIELD = 2n;

export async function writeNicknameBeforeReservations(
  faucet: { getAddress(): Promise<string> },
  player: string,
  nickname: string
) {
  const text = ethers.toUtf8Bytes(nickname);
  if (text.length > 31) throw new Error("Only short nicknames fit in one storage slot.");
  const slot = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [player, FAUCET_STORAGE + NICKNAMES_FIELD]
    )
  );
  const packed = new Uint8Array(32);
  packed.set(text);
  packed[31] = text.length * 2;
  await setStorageAt(await faucet.getAddress(), slot, ethers.hexlify(packed));
}
