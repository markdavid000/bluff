import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { Bluff } from "../../types";

export async function readyAndStart(
  bluff: Bluff,
  id: bigint,
  players: HardhatEthersSigner[]
): Promise<void> {
  const [host, ...others] = players;
  for (const player of others) {
    await (await bluff.connect(player).setReady(id, true)).wait();
  }
  await (await bluff.connect(host).startTable(id)).wait();
}

export async function startFreeGame(bluff: Bluff, players: HardhatEthersSigner[]): Promise<bigint> {
  const [host, ...others] = players;
  await (await bluff.connect(host).createFreeTable(players.length, false)).wait();
  const id = await bluff.tableOf(host.address);
  for (const player of others) {
    await (await bluff.connect(player).joinFreeTable(id)).wait();
  }
  await readyAndStart(bluff, id, players);
  return id;
}
