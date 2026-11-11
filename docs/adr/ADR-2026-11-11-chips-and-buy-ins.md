# ADR-2026-11-11: Chips and buy-ins

- **Status:** Approved
- **Approved by:** (MarkDavid, 11th Nov 2026)
- **Supersedes:** in [ADR-2026-11-10-game-rules.md](ADR-2026-11-10-game-rules.md), the open choice of chip token; in [ADR-2026-11-10-game-flow-and-timing.md](ADR-2026-11-10-game-flow-and-timing.md), the condition for claiming more practice chips and the "not enough chips" edge case.
- **Companion:** [ADR-2026-11-11-chips-and-buy-ins-for-dummies.md](ADR-2026-11-11-chips-and-buy-ins-for-dummies.md)

## Context

Chips are a confidential ERC-7984 token. Three facts found while planning the contract change how they work:

1. **Zama's Sepolia test token `cUSDTMock`** (`0x4E7B06D78965594eB5EF5414c357ca21E1554491`) cannot be minted directly. It wraps a mock USDT (`0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0`) whose `mint(address,uint256)` is public. A player gets cUSDT by minting USDT, approving the wrapper and calling `wrap`: three moves.
2. **An ERC-7984 transfer never fails for lack of balance.** OpenZeppelin's `ERC7984` (0.5.3) transfers an encrypted zero instead and returns the encrypted amount actually moved. A player with no chips could join a paid table, pay nothing, and win the others' chips.
3. **Balances are encrypted.** The contract cannot check "fewer than 10 chips" in the clear, so the claim condition in the game flow ADR cannot be enforced as written.

## Options considered

### Chip token

- **Our own ERC-7984 "Bluff chips" with a built-in faucet.** Simple, fully under our control, but invented for the game.
- **Zama's `cUSDTMock`, topped up by a faucet contract.** The official test token from Zama's registry; shows real ecosystem integration. The faucet mints mock USDT to itself and wraps it straight to the player, so claiming is one move for the player.

### Making sure a buy-in was paid

- **Trust the transfer.** Exploitable, as above.
- **Pay first, check at the start.** Each paid seat stores an encrypted "paid in full" flag. When the table starts, all flags are made public in one reveal; seats that did not pay are removed and the table goes back to waiting. Adds one reveal (about 20 to 30 seconds) to the start of paid games only.
- **Check on every join.** Same check, but a reveal per join; slower for everyone.

### Paying the buy-in

- **Operator approval, then `confidentialTransferFrom`.** Two moves, and the game holds a standing right to move the player's chips until the approval expires; with an upgradeable game that is a large trust surface.
- **`confidentialTransferAndCall` with a receiver callback.** The player sends the encrypted buy-in to the game with the table in the call data, in one move. The token calls the game's `onConfidentialTransferReceived`; if the game answers false, the token refunds automatically. The game never holds an approval.

### Claiming more practice chips

- **Keep the balance condition.** Impossible to enforce onchain.
- **Once every 24 hours, no balance condition.** Practice chips have no value, so a daily claim is harmless.

## Decision

- Chips are **`cUSDTMock`** on Sepolia, through **`@openzeppelin/confidential-contracts` 0.5.3**, the release that pins `@fhevm/solidity` 0.11.1. In local tests, an ERC-20 mock and an `ERC7984ERC20Wrapper` mock stand in for it.
- A **`ChipFaucet`** contract gives **100 chips per claim, once every 24 hours per player**, by minting mock USDT and wrapping it to the player in one move. The first claim also saves the player's nickname, as the game flow ADR requires.
- **Buy-ins** are paid with `confidentialTransferAndCall` on the chip token, carrying the action (create or join) and its arguments. Bluff's `onConfidentialTransferReceived` accepts only calls from the chip token, records the seat with `paidInFull = FHE.eq(amount, buyIn)`, and returns `paidInFull` (granted to the token) so an amount other than the exact buy-in is refunded by the token. Bluff never refunds a rejected transfer itself, which would refund twice. Free tables are created and joined directly.
- **Paid tables verify seats at the start:** the "paid in full" flags are revealed together, unpaid seats are removed with an event, and the table returns to waiting with the countdown restarted. Free tables skip the check.
- **The app warns early:** before joining, the player's own balance is decrypted in their browser, and a short balance gets "You need 10 chips for this table" with a link to claim more. The contract's check is the backstop.
- **The pot** is the encrypted sum of what was actually paid. Payouts and refunds move encrypted amounts; ties divide the pot with `FHE.div`, and the remainder goes to the tied player who joined first.

## Diagram

```
 claim ─► ChipFaucet ─ mint mock USDT ─► wrap ─► cUSDTMock balance (encrypted)
                                                        │
 join ─► chips.confidentialTransferAndCall(Bluff, buy-in, table) ─► Bluff callback: paidInFull = (moved == buy-in)
                                                                     └─ false ─► token refunds
                                                        │
 table full / host starts ─► reveal all paid flags ─► unpaid removed? ─yes─► back to waiting
                                                        │no
                                                        ▼
                                                    first roll
```

## Consequences

- Real integration with Zama's registry token, with one-move claims for players.
- Nobody can play a paid table without paying.
- Paid games start about 20 to 30 seconds later than free ones.
- The faucet depends on the mock USDT keeping a public `mint`; if Zama changes it, the faucet is redeployed against our own ERC-7984 token.
- Packages added with the contract: `@openzeppelin/confidential-contracts` 0.5.3 and its peers `@openzeppelin/contracts` and `@openzeppelin/contracts-upgradeable` 5.7.0.
- The deployed `cUSDTMock` is a proxy; its live ABI is checked on Etherscan before the Sepolia deploy.

## Verification

Contract tests on the FHEVM mock: a claim gives exactly 100 chips and a second claim within 24 hours is refused; a player with no chips who joins a paid table is removed at the start; a full payout, a tie split with a remainder, and every refund move exactly the right encrypted amounts.
