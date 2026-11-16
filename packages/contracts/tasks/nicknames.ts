import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { confirmedBlock, liveOwner } from "./chain";
import { readDeployment } from "./deployments";

const BLOCKS_PER_SCAN = 5_000;
const PLAYERS_PER_CALL = 50;

interface ManifestProxy {
  address: string;
  txHash?: string;
}

async function deployedAt(hre: HardhatRuntimeEnvironment, proxy: string): Promise<number> {
  const file = path.join(__dirname, "..", ".openzeppelin", `${hre.network.name}.json`);
  if (!existsSync(file)) {
    throw new Error(`No manifest for ${hre.network.name}; pass --from-block.`);
  }
  const manifest = JSON.parse(readFileSync(file, "utf8")) as { proxies?: ManifestProxy[] };
  const entry = manifest.proxies?.find(
    (item) => item.address.toLowerCase() === proxy.toLowerCase()
  );
  if (!entry?.txHash)
    throw new Error(`The manifest has no deployment for ${proxy}; pass --from-block.`);
  const receipt = await hre.ethers.provider.getTransactionReceipt(entry.txHash);
  if (!receipt) throw new Error(`Deployment transaction ${entry.txHash} was not found.`);
  return receipt.blockNumber;
}

task("reserve-nicknames", "Reserves the nicknames players set before names had to be unique")
  .addOptionalParam("fromBlock", "First block to scan for nicknames", undefined, types.string)
  .setAction(async ({ fromBlock }: { fromBlock?: string }, hre) => {
    await liveOwner(hre);
    const record = readDeployment(hre.network.name);
    const faucetRecord = record.contracts.ChipFaucet;
    if (!faucetRecord) throw new Error(`ChipFaucet is not recorded on ${hre.network.name}.`);
    const faucet = await hre.ethers.getContractAt("ChipFaucet", faucetRecord.proxy);

    const start =
      fromBlock === undefined ? await deployedAt(hre, faucetRecord.proxy) : Number(fromBlock);
    const end = await hre.ethers.provider.getBlockNumber();
    const players: string[] = [];
    for (let from = start; from <= end; from += BLOCKS_PER_SCAN) {
      const to = Math.min(from + BLOCKS_PER_SCAN - 1, end);
      const events = await faucet.queryFilter(faucet.filters.NicknameSet(), from, to);
      for (const event of events) {
        const player = event.args.player;
        if (!players.some((known) => known.toLowerCase() === player.toLowerCase()))
          players.push(player);
      }
    }
    console.log(`Found ${players.length} players with nicknames from block ${start} to ${end}.`);

    const reserved: string[] = [];
    for (let at = 0; at < players.length; at += PLAYERS_PER_CALL) {
      const batch = players.slice(at, at + PLAYERS_PER_CALL);
      const sent = await faucet.reserveExistingNicknames(batch);
      const block = await confirmedBlock(hre, sent);
      const events = await faucet.queryFilter(faucet.filters.NicknameReserved(), block, block);
      for (const event of events) reserved.push(event.args.player);
    }

    const duplicates: string[] = [];
    for (const player of players) {
      const nickname = await faucet.nicknameOf(player);
      if (nickname.length > 0 && (await faucet.isNicknameTaken(nickname, player))) {
        duplicates.push(player);
        console.log(`Shares a nickname with an earlier holder: ${player} ("${nickname}")`);
      }
    }
    console.log(
      `Reserved ${reserved.length} nicknames; ${duplicates.length} duplicates kept their name unreserved.`
    );
    return { reserved, duplicates };
  });
