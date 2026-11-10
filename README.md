# Bluff

A dice game of nerve. Everyone rolls dice that only they can see, bids on what is on the table, and calls out the liars.

Bluff is a confidential version of Liar's Dice. On a normal public blockchain every player's dice would be readable by anyone, which makes bluffing impossible. Bluff keeps the dice encrypted onchain with the [Zama Protocol](https://docs.zama.org/protocol): the contract rolls them with onchain randomness, only their owner can see them, and they are revealed with a proof when someone calls a bluff.

> This project is not audited, endorsed or operated by Zama. Use at your own risk.

## Quick start

```bash
pnpm install          # also installs the Git hooks
pnpm compile          # compile the contracts and generate their types
pnpm dev              # http://localhost:3000
```

Requires Node.js 24 (see `.nvmrc`) and pnpm (pinned in `package.json`).

## Repository

| Path                 | Package            | What it is                                   |
| -------------------- | ------------------ | -------------------------------------------- |
| `apps/web`           | `@bluff/web`       | The game players use                         |
| `packages/contracts` | `@bluff/contracts` | The game contracts, tests and deploy scripts |

## Read next

| Document                                                         | For                                               |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                             | Setup, scripts, branches, commits, pull requests  |
| [`docs/engineering-standards.md`](docs/engineering-standards.md) | The coding bar                                    |
| [`docs/architecture.md`](docs/architecture.md)                   | Packages, layers and import rules                 |
| [`AGENTS.md`](AGENTS.md)                                         | Rules for AI coding agents                        |
| [`docs/adr/`](docs/adr/)                                         | Architectural decisions, including the game rules |
| [`SECURITY.md`](SECURITY.md)                                     | Reporting vulnerabilities                         |

## Stack

| Concern         | Choice                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| Web framework   | Next.js 16.4, App Router, React 19.3 with the React Compiler                          |
| Language        | TypeScript, strict                                                                    |
| Styling and UI  | Tailwind CSS v4, shadcn/ui                                                            |
| Contracts       | Solidity 0.8.27, Hardhat 2, Zama FHEVM (`@fhevm/solidity`)                            |
| Confidentiality | Zama Protocol on Sepolia, Zama SDK in the browser                                     |
| Tests           | Vitest and Testing Library; Hardhat with the FHEVM mock                               |
| Quality         | ESLint with architecture boundaries, solhint, Prettier, knip, comment and copy checks |
| Git hooks       | Lefthook, commitlint                                                                  |
| Hosting         | Cloudflare Workers via OpenNext; contracts on Sepolia                                 |
| Package manager | pnpm workspaces                                                                       |
