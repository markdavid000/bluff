import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/deploy";
import "./tasks/invites";
import "./tasks/upgrade";
import "./tasks/validate-layout";

const MNEMONIC = vars.get(
  "MNEMONIC",
  "test test test test test test test test test test test junk"
);
const SEPOLIA_RPC_URL = vars.get("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com");

const BLUFF_OPTIMIZER_RUNS = 50;

function compilerSettings(runs: number) {
  return {
    metadata: { bytecodeHash: "none" as const },
    optimizer: { enabled: true, runs },
    evmVersion: "cancun",
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: vars.get("ETHERSCAN_API_KEY", ""),
  },
  gasReporter: {
    currency: "USD",
    enabled: Boolean(process.env.REPORT_GAS),
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      accounts: { mnemonic: MNEMONIC, path: "m/44'/60'/0'/0/", count: 10 },
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    compilers: [{ version: "0.8.27", settings: compilerSettings(800) }],
    overrides: {
      "contracts/Bluff.sol": {
        version: "0.8.27",
        settings: compilerSettings(BLUFF_OPTIMIZER_RUNS),
      },
      "contracts/mocks/BluffV2Mock.sol": {
        version: "0.8.27",
        settings: compilerSettings(BLUFF_OPTIMIZER_RUNS),
      },
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
