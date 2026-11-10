# ADR-2026-11-10: Onboarding with Privy

- **Status:** Approved, pending the Sepolia spike below
- **Approved by:** (MarkDavid, 10th Nov 2026)
- **Companion:** [ADR-2026-11-10-onboarding-with-privy-for-dummies.md](ADR-2026-11-10-onboarding-with-privy-for-dummies.md)

## Context

Bluff is built for people who have never used a crypto wallet. Two things stop them today: installing a wallet, and getting Sepolia ETH to pay for every move. Judges face the same friction. Every move in Bluff is a transaction, so both problems repeat on every turn.

Zama's encryption and user decryption are bound to the player's address. Encrypted inputs are created for `(contract, userAddress)`, and decrypting one's own dice needs an EIP-712 permit signed by that address and checked by Zama's KMS.

## Options considered

### Accounts

- **External wallets only.** No new dependency; excludes most of the intended audience.
- **Privy embedded wallets plus external wallets.** Email and Google sign-in create a self-custodial wallet; Privy offers a wagmi integration, so the rest of the app is unchanged. The embedded wallet is an EOA, so encryption and EIP-712 permits work as with any wallet.

### Fees

- **Players fund their own gas.** A faucet trip before the first move.
- **Smart accounts with a paymaster (ERC-4337, for example ZeroDev).** Gas is sponsored, but `msg.sender` becomes a contract account. Zama permits would then need ERC-1271 verification, which we have not confirmed the KMS supports.
- **EIP-7702 sponsorship on the embedded EOA.** The player keeps their EOA address and key; a sponsor pays gas. Encryption and permits keep working because the address and signer do not change. Privy documents gas sponsorship; ZeroDev also supports 7702.

## Decision

Subject to the spike:

- Privy for sign-in: email and Google create an embedded wallet; external wallets remain available through the same modal.
- Embedded wallet transactions and permits do not show a confirmation screen, so `confirming` is skipped for these players.
- Gas sponsorship through EIP-7702 on the embedded EOA, using Privy's sponsorship if it covers Sepolia, otherwise ZeroDev. One vendor is preferred.
- If sponsorship fails the spike, players with embedded wallets are topped up from a small faucet flow inside the app, and this ADR is revised.

### The spike (before any feature work)

On Sepolia, with a throwaway contract:

1. Sign in with Google and receive an embedded wallet.
2. Encrypt an input in the browser with the Zama SDK for that address and send it in a sponsored transaction.
3. Grant the address access to the stored value and decrypt it in the browser with a permit.
4. Make a value publicly decryptable, fetch the clear value and proof, and verify it onchain.

Record the result, timings and any failure in this ADR before it is approved.

## Diagram

```
 Google / email ──► Privy ──► embedded EOA (same address everywhere)
                                │
            wagmi connector ◄───┘
                 │
   Zama SDK encrypt(contract, EOA) ──► sponsored tx (7702) ──► Bluff
   Zama SDK permit signed by EOA  ──► KMS ──► own dice in the browser
```

## Consequences

- New players can play within seconds of signing in, with no wallet install and no faucet.
- A third-party dependency for sign-in, with a free tier sufficient for the competition.
- Packages added with the account feature: `@privy-io/react-auth`, `@privy-io/wagmi`, and a sponsorship SDK only if Privy's own sponsorship does not cover Sepolia.
- Privy's app id is public by design; any server secret stays in Cloudflare.
- If Zama later confirms ERC-1271 support, smart accounts become an option.

## Verification

The spike's four steps pass on Sepolia and their timings are recorded. After the account feature lands, a manual round is played start to finish with a Google account that holds no ETH, and with an external wallet.
