import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { fhevm } from "hardhat";
import type { Bluff } from "../../types";
import { decryptDice } from "./dice";

const WILD_FACE = 1;
const BID_FACES = [2, 3, 4, 5, 6];

export function countMatching(values: bigint[], face: number): number {
  return values.filter((value) => {
    const shown = Number(value) + 1;
    return shown === face || shown === WILD_FACE;
  }).length;
}

export async function tableValues(
  bluff: Bluff,
  id: bigint,
  players: HardhatEthersSigner[]
): Promise<bigint[]> {
  const [, seats] = await bluff.getTable(id);
  const values: bigint[] = [];
  for (const seat of seats) {
    const owner = players.find((player) => player.address === seat.player);
    if (owner && seat.isActive) values.push(...(await decryptDice(bluff, id, owner)));
  }
  return values;
}

export async function trueBid(
  bluff: Bluff,
  id: bigint,
  players: HardhatEthersSigner[]
): Promise<{ quantity: number; face: number }> {
  const values = await tableValues(bluff, id, players);
  const face = BID_FACES.reduce((best, candidate) =>
    countMatching(values, candidate) > countMatching(values, best) ? candidate : best
  );
  return { quantity: countMatching(values, face), face };
}

export async function falseBid(
  bluff: Bluff,
  id: bigint,
  players: HardhatEthersSigner[]
): Promise<{ quantity: number; face: number }> {
  const values = await tableValues(bluff, id, players);
  const face = BID_FACES.reduce((best, candidate) =>
    countMatching(values, candidate) < countMatching(values, best) ? candidate : best
  );
  return { quantity: countMatching(values, face) + 1, face };
}

export async function settle(bluff: Bluff, id: bigint, settler: HardhatEthersSigner) {
  const handles = await bluff.revealHandles(id);
  const result = await fhevm.publicDecrypt([...handles]);
  return bluff
    .connect(settler)
    .settleReveal(id, result.abiEncodedClearValues, result.decryptionProof);
}

function signerAt(players: HardhatEthersSigner[], address: string): HardhatEthersSigner {
  const signer = players.find((player) => player.address === address);
  if (!signer) throw new Error(`No signer for ${address}`);
  return signer;
}

export async function playerOnTurn(
  bluff: Bluff,
  id: bigint,
  players: HardhatEthersSigner[]
): Promise<HardhatEthersSigner> {
  const [table, seats] = await bluff.getTable(id);
  return signerAt(players, seats[Number(table.turn)].player);
}
