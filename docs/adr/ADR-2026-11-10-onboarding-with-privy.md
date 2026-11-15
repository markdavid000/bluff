# ADR-2026-11-10: Onboarding with Privy

- **Status:** Approved; the Sepolia spike passed on 2026-11-11 (results below)
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
- Privy's app id is public by design; any server secret stays in Vercel.
- If Zama later confirms ERC-1271 support, smart accounts become an option.

## Verification

The spike's four steps pass on Sepolia and their timings are recorded. After the account feature lands, a manual round is played start to finish with a Google account that holds no ETH, and with an external wallet.

## Spike results (2026-11-11)

Run on Sepolia against a throwaway contract, `SpikeVault` at `0xA8C54EB2673c3274a1def42f668F3244dfe4D9c5`, from a one-page Vite app using `@privy-io/react-auth` 3.51.3, `@zama-fhe/sdk` 3.7.2 and viem 2.57.17. The spike code was throwaway and was not kept: the shipped sign-in, sponsored moves, private decryption and public reveals replace it, and this section records what it found.

| Check                                            | Result                                            | Time (three runs)     |
| ------------------------------------------------ | ------------------------------------------------- | --------------------- |
| Sign in with email, then Google; embedded wallet | Passed; Google linked to the same user and wallet |                       |
| Encrypt a `euint64` in the browser               | Passed                                            | 14.1 to 17.3 s (cold) |
| Store it in a sponsored transaction              | Passed                                            | 5.8 to 7.0 s          |
| Decrypt it as its owner (permit and relayer)     | Passed; failed once, see below                    | 5.7 to 7.1 s          |
| Roll a public random value, sponsored            | Passed                                            | 4.9 to 5.9 s          |
| Public decryption with proof                     | Passed                                            | 4.8 to 7.4 s          |
| Verify the proof onchain, sponsored              | Passed; the onchain value matched                 | 5.2 to 9.1 s          |
| Who paid                                         | The player's balance stayed at 0 wei in every run |                       |

What it showed:

- **Sponsorship works with Zama.** Privy's native sponsorship upgraded the embedded wallet through EIP-7702 (its code starts with `0xef0100`), so the player keeps one address. Encrypted inputs, the EIP-712 decryption permit and `msg.sender` checks all worked unchanged. Privy's own sponsorship covers Sepolia, so ZeroDev is not needed.
- **Moves are faster than estimated.** A sponsored move confirmed in about 6 seconds, usually in the next block, against the 12 to 24 seconds assumed in the game flow ADR. A call and its settlement took about 13 seconds against 20 to 30.
- **The first encryption is slow.** 14 to 17 seconds while the SDK loads its WASM modules and the FHE public key. The SDK must start loading in the lobby, as the engineering standards already require.
- **Decryption must ride out gateway propagation.** One decryption failed in 1.6 seconds with "Failed to decrypt encrypted values" and then passed on later runs. Zama's gateway on Arbitrum reads a synced copy of the ACL, which lags Sepolia by about ten blocks. The SDK retries only delegated decryption on its own. Bluff's decryption hooks retry user and public decryption every 2 seconds for up to 30 seconds, and the roll animation covers the wait.
- **Google needs its own OAuth client.** Privy refused Google until it was enabled with credentials. Bluff now uses its own Google client, so the consent screen says Bluff. The redirect URI is `https://auth.privy.io/api/v1/oauth/callback`. **The consent screen must be published to production before submission**, or only listed test users can sign in.
- **Brave users may need to lower Shields** for Google sign-in; the sign-in screen offers email as the fallback.
- **Build notes for the web app:**
  - Privy's optional Solana modules break the production build unless `@solana/kit` 8.x is installed alongside it.
  - The Zama WASM bundles are about 1.3 MB gzipped each, so they load only on game routes.
  - A contract function named `valueOf` collides with JavaScript's `Object.prototype.valueOf` in ethers and must never be used.
