import { AbiCoder, keccak256, toBeHex, zeroPadValue } from "ethers";
import { ethers, network } from "hardhat";

const BLUFF_STORAGE = 0x23b5f92c78153b667665d35bef9c2d58f327709d7637cfd5b4e5892e2333f700n;
const NONCE_SLOT = BLUFF_STORAGE + 1n;
const MAX_ID = 2n ** 48n;

let draws = 0n;

export function tableIdFrom(prevrandao: bigint, host: string, nonce: bigint): bigint {
  const hash = keccak256(
    AbiCoder.defaultAbiCoder().encode(["uint256", "address", "uint256"], [prevrandao, host, nonce])
  );
  return BigInt(hash) % MAX_ID;
}

export async function nextTableId(
  bluff: { getAddress(): Promise<string> },
  host: { address: string }
) {
  draws += 1n;
  const prevrandao = BigInt(keccak256(AbiCoder.defaultAbiCoder().encode(["uint256"], [draws])));
  await network.provider.send("hardhat_setPrevRandao", [zeroPadValue(toBeHex(prevrandao), 32)]);
  const nonce = BigInt(await ethers.provider.getStorage(await bluff.getAddress(), NONCE_SLOT));
  return tableIdFrom(prevrandao, host.address, nonce + 1n);
}
