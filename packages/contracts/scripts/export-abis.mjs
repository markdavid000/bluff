import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  ["bluffAbi", "contracts/Bluff.sol/Bluff.json"],
  ["bluffCashierAbi", "contracts/BluffCashier.sol/BluffCashier.json"],
  ["bluffInvitesAbi", "contracts/BluffInvites.sol/BluffInvites.json"],
  ["chipFaucetAbi", "contracts/ChipFaucet.sol/ChipFaucet.json"],
  ["chipTokenAbi", "contracts/mocks/MockConfidentialUSDT.sol/MockConfidentialUSDT.json"],
  ["dollarTokenAbi", "contracts/mocks/MockUSDT.sol/MockUSDT.json"],
];

const lines = SOURCES.map(([name, artifact]) => {
  const { abi } = JSON.parse(readFileSync(path.join(root, "artifacts", artifact), "utf8"));
  return `export const ${name} = ${JSON.stringify(abi, null, 2)} as const;\n`;
});

mkdirSync(path.join(root, "exports"), { recursive: true });
writeFileSync(path.join(root, "exports", "abis.ts"), lines.join("\n"));
console.log(`Exported ${SOURCES.length} ABIs to exports/abis.ts`);
