# Security policy

> This project is not audited, endorsed or operated by Zama. Use at your own risk.

## Reporting a vulnerability

Report vulnerabilities privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue, pull request or discussion.

Include what you found, how to reproduce it, and the impact you expect. A report about the game contract should name the function and the sequence of calls. We acknowledge reports within three working days and keep you informed until the issue is fixed.

The issues we most want to hear about:

- a way for a player to learn another player's dice before a reveal,
- a way to influence or predict a dice roll,
- a way to act out of turn, skip a challenge or replay a reveal,
- a way to take chips from a table or another player.

## Supported versions

Only the code on `main`, deployed to production, and the contracts deployed from it to Sepolia are supported. Fixes ship from `main`.

Bluff runs on the Sepolia test network with practice chips only. The contracts are not audited and must not be deployed to a network that holds real value without an audit.

## Handling secrets

Secrets never enter the repository.

- Web app secrets live in Vercel environment variables.
- The contract deployer mnemonic and RPC keys live in Hardhat's encrypted variable store (`npx hardhat vars set`), on the deployer's machine only.
- Every pull request is scanned with gitleaks. If a secret is committed by mistake, treat it as leaked: rotate it first (for a deployer key, move any funds and redeploy from a new key), then remove it from history.
