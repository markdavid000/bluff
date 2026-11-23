import { sepoliaDeployment } from "@bluff/contracts";
import { describe, expect, it } from "vitest";
import { codeLinks, contractLinks } from "./check-links";

describe("contractLinks", () => {
  it("points at each deployed contract's verified source, so a redeploy can't leave a stale link", () => {
    const hrefs = contractLinks().map((link) => link.href);
    expect(hrefs).toEqual([
      `https://sepolia.etherscan.io/address/${sepoliaDeployment.bluff}#code`,
      `https://sepolia.etherscan.io/address/${sepoliaDeployment.cashier}#code`,
      `https://sepolia.etherscan.io/address/${sepoliaDeployment.invites}#code`,
      `https://sepolia.etherscan.io/address/${sepoliaDeployment.faucet}#code`,
    ]);
  });
});

describe("codeLinks", () => {
  it("points at the confidentiality tests and the repository", () => {
    expect(codeLinks().map((link) => link.href)).toEqual([
      "https://github.com/markdavid000/bluff/blob/main/packages/contracts/test/unit/confidentiality.test.ts",
      "https://github.com/markdavid000/bluff",
    ]);
  });
});
