import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { Bluff } from "../../types";

export async function startFreeGame(bluff: Bluff, players: HardhatEthersSigner[]): Promise<bigint> {
  const [host, ...others] = players;
  await (await bluff.connect(host).createFreeTable(players.length, false)).wait();
  const id = await bluff.tableOf(host.address);
  for (const player of others) {
    await (await bluff.connect(player).joinFreeTable(id)).wait();
  }
  return id;
}
