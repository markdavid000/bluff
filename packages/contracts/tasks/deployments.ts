import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface ProxyRecord {
  proxy: string;
  implementation: string;
  version: string;
}

export interface DeploymentRecord {
  network: string;
  chainId: number;
  deployer: string;
  deployedAt: string;
  chips: string;
  dollars: string;
  contracts: Record<"Bluff" | "BluffCashier" | "ChipFaucet", ProxyRecord>;
}

export type ProxyName = keyof DeploymentRecord["contracts"];

const DEPLOYMENTS_DIRECTORY = path.join(__dirname, "..", "deployments");

function deploymentPath(network: string): string {
  return path.join(DEPLOYMENTS_DIRECTORY, `${network}.json`);
}

export function readDeployment(network: string): DeploymentRecord {
  const file = deploymentPath(network);
  if (!existsSync(file)) {
    throw new Error(`No deployment recorded for ${network}. Run the deploy task first.`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as DeploymentRecord;
}

export function writeDeployment(record: DeploymentRecord): string {
  mkdirSync(DEPLOYMENTS_DIRECTORY, { recursive: true });
  const file = deploymentPath(record.network);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}
