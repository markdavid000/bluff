import { ethers } from "hardhat";

export function kmsVerifier() {
  return ethers.getContractAt(
    ["error KMSInvalidSigner(address invalidSigner)"],
    ethers.ZeroAddress
  );
}
