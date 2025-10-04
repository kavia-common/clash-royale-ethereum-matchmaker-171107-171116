# Clash Royale Ethereum Matchmaker — Frontend

This React app lets users link Clash Royale accounts, browse profiles, filter by wager, initiate matches, and deposit ETH into escrow. It supports mock API and dry-run escrow modes for rapid local development, and can be configured to use real backend services and a testnet like Sepolia.

## Overview

- Mock API mode is enabled when REACT_APP_API_URL is not set. The UI shows a banner and returns deterministic mock data for profiles, live wagers, and history.
- Dry-run escrow mode is enabled when REACT_APP_DRY_RUN_ESCROW=true or when REACT_APP_ESCROW_ADDRESS is missing. Deposits are simulated and return a synthetic transaction hash.

Core files:
- API client: src/services/api.js
- Blockchain client: src/services/blockchain.js
- Wallet hook: src/hooks/useEthereumWallet.js
- Key UI: ProfileList, WagerFilter, WalletStatus, EscrowModal, LinkAccountModal, GameHistoryPage

## Quickstart (Mock mode)

1) Install and run:
   - cd frontend
   - npm install
   - npm start
2) Do not set REACT_APP_API_URL to enable mock API mode.
3) Leave REACT_APP_ESCROW_ADDRESS unset to keep escrow in dry-run mode.
4) Open http://localhost:3000 and explore:
   - Use the Wager Filter to adjust listing ranges.
   - Click Challenge on a profile to open the Escrow modal.
   - Connect a wallet to see wallet UI; deposits are simulated in dry-run.

## Environment Variables

Create a .env file in frontend with the following keys:

- REACT_APP_API_URL: Backend base URL (e.g., http://localhost:8000). Optional during development; when omitted, mock mode is used.
- REACT_APP_ESCROW_ADDRESS: Deployed escrow contract address for the configured chain. If not set, escrow runs in dry-run.
- REACT_APP_CHAIN_ID: Decimal chain ID (e.g., 11155111 for Sepolia). Used to warn when the wallet is on the wrong network.
- REACT_APP_BLOCK_EXPLORER_BASE: Explorer base URL (e.g., https://sepolia.etherscan.io). Enables deep links to tx/address pages.
- REACT_APP_DRY_RUN_ESCROW: true to force escrow simulation.

Notes
- Prefix variables with REACT_APP_ to expose them to the app.
- In development, the app logs warnings for missing/invalid envs and uses sane defaults for Sepolia.

## Switching to Real Services

Backend:
- Set REACT_APP_API_URL to your backend (http://localhost:8000 in local dev, or production URL).

Ethereum (Sepolia example):
- REACT_APP_CHAIN_ID=11155111
- REACT_APP_BLOCK_EXPLORER_BASE=https://sepolia.etherscan.io
- REACT_APP_ESCROW_ADDRESS=0xYourDeployedEscrowAddress
- Ensure your wallet is switched to Sepolia.

Escrow mode:
- Set REACT_APP_DRY_RUN_ESCROW=false and supply REACT_APP_ESCROW_ADDRESS to send real transactions.

## Ethereum Wallet & Verification Flow

WalletStatus.jsx uses the useEthereumWallet hook to manage connect/disconnect and displays the current address and network. It implements a SIWE-style verification:
- The app requests a nonce via api.getWalletNonce(address).
- The wallet signs a simple message.
- The app calls api.verifyWalletSignature({ address, signature }) to establish a session.

Network checks compare the wallet chainId with REACT_APP_CHAIN_ID (and escrow config when provided). The UI warns on mismatches.

## Escrow (Deposit/Withdraw) Flow

EscrowModal.jsx orchestrates match initiation and deposit:
- Initiate: api.initiateWager({ opponentId, wagerEth }) returns a wager/match ID.
- Deposit: BlockchainClient.deposit({ wagerId, amountEth }) sends the transaction.
  - Dry-run simulates and returns a synthetic hash.
  - Real sends to deposit(uint256) payable on the escrow contract (placeholder ABI; update when finalized).
- Notify: api.depositNotify({ id, txHash, amountEth }) updates the backend.
- Confirm: api.confirmWager({ id }) may be called depending on backend logic.
- Status: The UI polls api.getEscrowStatus to detect readiness and links to the explorer when configured.

Withdrawals/refunds are not yet implemented in the UI.

## Matchmaking & Wager Filtering

- ProfileList.jsx fetches profiles via api.getProfiles with optional minWager and maxWager, applies client-side filtering, and supports pagination.
- WagerFilter.jsx manages a min/max ETH range and provides presets for quick selection.

## Clash Royale Account Linking

- LinkAccountModal.jsx supports linking by player tag or API token with local validation.
- A verified wallet session is required in the default flow; alternatively, provide an onSubmit handler to handle linking externally.
- The app calls api.crLink and api.getCRMe to persist and refresh the linked profile.

## Game History & Live Wagers

- api.getWagerHistory provides historical matches and stats for the current session user.
- api.getLiveWagers powers the live feed in GameHistoryPage.jsx; in mock mode, a gentle ticker simulates activity.

## Troubleshooting

- Missing env vars:
  - The app logs warnings in development. Set REACT_APP_CHAIN_ID, REACT_APP_BLOCK_EXPLORER_BASE, and REACT_APP_ESCROW_ADDRESS for real on-chain operations.
- Wrong network:
  - WalletStatus and EscrowModal display hints if the wallet’s chainId differs. Switch your wallet to the configured network (e.g., Sepolia).
- No wallet detected:
  - Install MetaMask or a compatible wallet. The app shows a user-friendly error when no provider is present.
- Deposit errors:
  - “Transaction rejected” indicates a user cancellation.
  - “Insufficient funds or gas” suggests topping up ETH on the testnet.
  - In dry-run mode, deposits are simulated—set REACT_APP_DRY_RUN_ESCROW=false and provide an escrow address to send real txs.
- API 401/403:
  - Ensure you have completed wallet verification. The app requests a nonce and verifies a signature to establish a session.

## Security Notes

- Never commit .env files or private API keys. Treat any tokens and signatures as sensitive.
- Always validate signatures and nonces server-side with expirations.
- The frontend runs in a zero-trust model; do not rely on client-side checks for authorization or settlement-critical logic.

## Scripts

- npm start: Run the app locally at http://localhost:3000
- npm test: Run the test suite
- npm run build: Build production assets

Important
- The escrow ABI and method names are placeholders. Update src/services/blockchain.js once your contract is finalized.
- The frontend’s assumed API endpoints are documented in INTEGRATION_NOTES.md and should be aligned with your backend.

