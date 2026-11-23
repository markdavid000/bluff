import { sepoliaDeployment } from "@bluff/contracts";
import { siteConfig } from "@/config/site";
import { fairnessCopy } from "../copy";

const ETHERSCAN = "https://sepolia.etherscan.io/address";
const CONFIDENTIALITY_TESTS = "packages/contracts/test/unit/confidentiality.test.ts";
const CONTRACTS = ["bluff", "cashier", "invites", "faucet"] as const;

export interface CheckLink {
  label: string;
  href: string;
}

export function contractLinks(): CheckLink[] {
  return CONTRACTS.map((name) => ({
    label: fairnessCopy.contracts[name],
    href: `${ETHERSCAN}/${sepoliaDeployment[name]}#code`,
  }));
}

export function codeLinks(): CheckLink[] {
  return [
    {
      label: fairnessCopy.confidentialityTests,
      href: `${siteConfig.repository}/blob/main/${CONFIDENTIALITY_TESTS}`,
    },
    { label: fairnessCopy.sourceCode, href: siteConfig.repository },
  ];
}
