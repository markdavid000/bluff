import { bluffAbi, chipFaucetAbi, sepoliaDeployment } from "@bluff/contracts";
import { type Table, toTable } from "@bluff/game";
import { ZamaSDK } from "@zama-fhe/sdk";
import { node, sepolia as sepoliaFhe } from "@zama-fhe/sdk/node";
import { createConfig } from "@zama-fhe/sdk/viem";
import {
  type Address,
  type Hex,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseEventLogs,
} from "viem";
import { type HDAccount, mnemonicToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { MoveRefused, MoveReverted, TableMissing } from "./chain-errors";
import type { WatchChain } from "./chain-watch";
import type { BotConfig } from "./config";
import type { PoolChain } from "./player-pool";
import { gasLimit } from "./gas";
import { checkBlock, untilCaughtUp } from "./lagging";
import { revertName } from "./revert";
import type { BluffCall, SeatChain } from "./seat-runner";
import type { Seated, ServiceChain } from "./seat-service";

const BLUFF = sepoliaDeployment.bluff;
const FAUCET = sepoliaDeployment.faucet;
const BANK_INDEX = 0;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Signer {
  account: HDAccount;
  wallet: WalletClient;
  zama: ZamaSDK;
}

export function createChain(config: Pick<BotConfig, "mnemonic" | "rpcUrl" | "maxPlayers">) {
  const transport = http(config.rpcUrl, { retryCount: 3, timeout: 20_000 });
  const publicClient = createPublicClient({ chain: sepolia, transport, pollingInterval: 1_000 });
  const signers = new Map<number, Signer>();
  const queues = new Map<number, Promise<unknown>>();

  function signer(index: number): Signer {
    const existing = signers.get(index);
    if (existing) return existing;
    const account = mnemonicToAccount(config.mnemonic, { addressIndex: index });
    const wallet = createWalletClient({ account, chain: sepolia, transport });
    const zama = new ZamaSDK(
      createConfig({
        chains: [sepoliaFhe],
        publicClient,
        walletClient: wallet,
        relayers: { [sepoliaFhe.id]: node() },
      })
    );
    const created = { account, wallet, zama };
    signers.set(index, created);
    return created;
  }

  function oneAtATime<T>(index: number, job: () => Promise<T>): Promise<T> {
    const previous = queues.get(index) ?? Promise.resolve();
    const next = previous.then(job, job);
    queues.set(index, next);
    return next;
  }

  async function confirmed(hash: Hex) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new MoveReverted(hash);
    return { blockNumber: receipt.blockNumber };
  }

  function refused(error: unknown): never {
    const name = revertName(error);
    throw name === null ? error : new MoveRefused(name, error);
  }

  async function readTable(id: bigint, atBlock?: bigint): Promise<Table> {
    try {
      const [view, seats] = await untilCaughtUp(
        () =>
          publicClient.readContract({
            address: BLUFF,
            abi: bluffAbi,
            functionName: "getTable",
            args: [id],
            blockNumber: atBlock,
          }),
        pause
      );
      return toTable(view, seats);
    } catch (error) {
      if (revertName(error) === "TableNotFound") throw new TableMissing(id);
      throw error;
    }
  }

  function encode(call: BluffCall): Hex {
    return encodeFunctionData({ abi: bluffAbi, functionName: call.functionName, args: call.args });
  }

  async function checked(account: HDAccount, data: Hex, atBlock?: bigint): Promise<bigint> {
    const blockNumber = checkBlock(atBlock, await publicClient.getBlockNumber());
    const [tried, estimated] = await Promise.allSettled([
      untilCaughtUp(() => publicClient.call({ account, to: BLUFF, data, blockNumber }), pause),
      untilCaughtUp(
        () => publicClient.estimateGas({ account, to: BLUFF, data, blockNumber }),
        pause
      ),
    ]);
    if (tried.status === "rejected") refused(tried.reason);
    if (estimated.status === "rejected") throw estimated.reason;
    return gasLimit(estimated.value);
  }

  function send(
    index: number,
    call: BluffCall,
    atBlock?: bigint
  ): Promise<{ blockNumber: bigint }> {
    return oneAtATime(index, async () => {
      const { account, wallet } = signer(index);
      const data = encode(call);
      const gas = await checked(account, data, atBlock);
      const hash = await wallet
        .sendTransaction({ account, chain: sepolia, to: BLUFF, data, gas })
        .catch(refused);
      return confirmed(hash);
    });
  }

  function joinAndReady(index: number, tableId: bigint, atBlock: bigint): Promise<Seated> {
    return oneAtATime(index, async () => {
      const { account, wallet } = signer(index);
      const join = encode({ functionName: "joinFreeTable", args: [tableId] });
      const ready = encode({ functionName: "setReady", args: [tableId, true] });
      const gas = await checked(account, join, atBlock);
      const nonce = await publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      });
      const joinHash = await wallet
        .sendTransaction({ account, chain: sepolia, to: BLUFF, data: join, gas, nonce })
        .catch(refused);
      const readying = wallet
        .sendTransaction({
          account,
          chain: sepolia,
          to: BLUFF,
          data: ready,
          gas: gasLimit(undefined),
          nonce: nonce + 1,
        })
        .then((hash) => publicClient.waitForTransactionReceipt({ hash }));
      const [joined, readied] = await Promise.all([
        confirmed(joinHash),
        readying.then(
          (receipt) => ({ ok: true as const, receipt }),
          (problem: unknown) => ({ ok: false as const, problem })
        ),
      ]);
      if (!readied.ok)
        return { joinedBlock: joined.blockNumber, readyBlock: null, readyProblem: readied.problem };
      return {
        joinedBlock: joined.blockNumber,
        readyBlock: readied.receipt.status === "success" ? readied.receipt.blockNumber : null,
      };
    });
  }

  const chain: SeatChain & ServiceChain & PoolChain & WatchChain = {
    readTable,
    send,
    joinAndReady,
    async ownDice(index, id, timeoutMs, atBlock) {
      const { account, zama } = signer(index);
      const handles = await untilCaughtUp(
        () =>
          publicClient.readContract({
            address: BLUFF,
            abi: bluffAbi,
            functionName: "diceOf",
            args: [id, account.address],
            blockNumber: atBlock,
          }),
        pause
      );
      if (handles.length === 0) return [];
      const clear = await zama.decryption.decryptValues(
        handles.map((handle) => ({ encryptedValue: handle, contractAddress: BLUFF })),
        { timeout: timeoutMs, signal: AbortSignal.timeout(timeoutMs) }
      );
      return handles.map((handle) => clear[handle]);
    },
    async revealProof(id, timeoutMs, atBlock) {
      const handles = await untilCaughtUp(
        () =>
          publicClient.readContract({
            address: BLUFF,
            abi: bluffAbi,
            functionName: "revealHandles",
            args: [id],
            blockNumber: atBlock,
          }),
        pause
      );
      const result = await signer(BANK_INDEX).zama.decryption.decryptPublicValues([...handles], {
        timeout: timeoutMs,
        signal: AbortSignal.timeout(timeoutMs),
      });
      return { clearValues: result.abiEncodedClearValues, proof: result.decryptionProof };
    },
    balanceOf: (address) => publicClient.getBalance({ address }),
    nicknameOf: (address) =>
      publicClient.readContract({
        address: FAUCET,
        abi: chipFaucetAbi,
        functionName: "nicknameOf",
        args: [address],
      }),
    isNicknameTaken: (name, asker) =>
      publicClient.readContract({
        address: FAUCET,
        abi: chipFaucetAbi,
        functionName: "isNicknameTaken",
        args: [name, asker],
      }),
    tableOf: (address) =>
      publicClient.readContract({
        address: BLUFF,
        abi: bluffAbi,
        functionName: "tableOf",
        args: [address],
      }),
    fund(to, amount) {
      return oneAtATime(BANK_INDEX, async () => {
        const { account, wallet } = signer(BANK_INDEX);
        await confirmed(
          await wallet.sendTransaction({ account, chain: sepolia, to, value: amount })
        );
      });
    },
    setProfile(index, name, avatar) {
      return oneAtATime(index, async () => {
        const { account, wallet } = signer(index);
        await confirmed(
          await wallet
            .writeContract({
              address: FAUCET,
              abi: chipFaucetAbi,
              functionName: "setNickname",
              args: [name],
              account,
              chain: sepolia,
            })
            .catch(refused)
        );
        await confirmed(
          await wallet
            .writeContract({
              address: FAUCET,
              abi: chipFaucetAbi,
              functionName: "setAvatar",
              args: [avatar],
              account,
              chain: sepolia,
            })
            .catch(refused)
        );
      });
    },
    blockNumber: () => publicClient.getBlockNumber(),
    async touchedTables(fromBlock, toBlock) {
      const logs = await publicClient.getLogs({ address: BLUFF, fromBlock, toBlock });
      return parseEventLogs({ abi: bluffAbi, logs }).flatMap((log) => {
        const id = "id" in log.args ? log.args.id : undefined;
        return typeof id === "bigint" ? [id] : [];
      });
    },
  };

  return {
    chain,
    bank: signer(BANK_INDEX).account.address,
    players: Array.from(
      { length: config.maxPlayers },
      (_, i): Address => mnemonicToAccount(config.mnemonic, { addressIndex: i + 1 }).address
    ),
  };
}
