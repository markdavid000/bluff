import sepolia from "../deployments/sepolia.json";

export {
  bluffAbi,
  bluffCashierAbi,
  bluffInvitesAbi,
  chipFaucetAbi,
  chipTokenAbi,
  dollarTokenAbi,
} from "./abis";

type Address = `0x${string}`;

export interface BluffDeployment {
  chainId: number;
  chips: Address;
  dollars: Address;
  bluff: Address;
  cashier: Address;
  invites: Address;
  faucet: Address;
}

function asAddress(value: string): Address {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`Not an address: ${value}`);
  return value as Address;
}

export const sepoliaDeployment: BluffDeployment = {
  chainId: sepolia.chainId,
  chips: asAddress(sepolia.chips),
  dollars: asAddress(sepolia.dollars),
  bluff: asAddress(sepolia.contracts.Bluff.proxy),
  cashier: asAddress(sepolia.contracts.BluffCashier.proxy),
  invites: asAddress(sepolia.contracts.BluffInvites.proxy),
  faucet: asAddress(sepolia.contracts.ChipFaucet.proxy),
};
