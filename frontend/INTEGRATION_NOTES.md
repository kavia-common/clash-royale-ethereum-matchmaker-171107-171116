# Frontend Integration Notes

This document describes how the React frontend integrates with the backend API and Ethereum, including environment configuration, mock modes, wallet verification, escrow flows, and key UI behaviors. Contracts and endpoints are scaffolded and must be aligned with your backend and on-chain deployments.

## Overview

The frontend supports two development-friendly defaults:
- Mock API mode: Enabled when REACT_APP_API_URL is not set. The app returns deterministic mock data for profiles, live wagers, and history. A banner appears in listing components to indicate mock mode.
- Dry-run escrow mode: Enabled either when REACT_APP_DRY_RUN_ESCROW=true or when REACT_APP_ESCROW_ADDRESS is not set. Escrow deposits are simulated and return a synthetic transaction hash. The Escrow modal displays a dry-run banner.

These defaults let you develop the UI without a running backend or deployed contracts. To enable full integration, configure the environment variables and connect to a testnet such as Sepolia.

## Environment Variables

Required for full integration and used throughout the app:

- REACT_APP_API_URL: Backend API base URL (e.g., http://localhost:8000). If omitted, mock API mode is active.
- REACT_APP_ESCROW_ADDRESS: Escrow contract address on the configured chain. If empty, escrow runs in dry-run mode.
- REACT_APP_CHAIN_ID: Expected EVM chain ID as a decimal number (e.g., 11155111 for Sepolia). The UI warns on network mismatches.
- REACT_APP_BLOCK_EXPLORER_BASE: Base URL for the chain’s block explorer (e.g., https://sepolia.etherscan.io). Used for transaction/address links.
- REACT_APP_DRY_RUN_ESCROW: Set to true to always simulate escrow deposits regardless of address configuration.

Notes
- CRA requires REACT_APP_ prefixes. Keep your .env out of version control.
- The blockchain client derives defaults for development (Sepolia chainId 11155111, explorer base https://sepolia.etherscan.io) and logs warnings when variables are missing or invalid.

## Quickstart (Mock mode)

1) Install dependencies and start the app:
   - cd frontend
   - npm install
   - npm start
2) Leave REACT_APP_API_URL unset to enable mock API mode.
3) Leave REACT_APP_ESCROW_ADDRESS unset to keep escrow in dry-run mode.
4) Connect a wallet to see the UI behavior, though no real transactions are sent in dry-run.

Key indicators:
- Profile list shows an info banner that mock data is being used.
- Escrow modal shows an info banner that deposits are simulated.

## Switching to Real Services

To point the app at real backend and on-chain services:

1) Backend API
   - Set REACT_APP_API_URL to your backend (e.g., http://localhost:8000 or https://api.example.com).

2) Ethereum/Testnet (Sepolia example)
   - Set REACT_APP_CHAIN_ID to 11155111.
   - Set REACT_APP_BLOCK_EXPLORER_BASE to https://sepolia.etherscan.io.
   - Deploy your escrow contract and set REACT_APP_ESCROW_ADDRESS to the deployed address (0x-prefixed, 40 hex chars).
   - Ensure your wallet is on Sepolia. The UI warns if the selected network chainId differs.

3) Dry-run toggle
   - Set REACT_APP_DRY_RUN_ESCROW=false and ensure REACT_APP_ESCROW_ADDRESS is provided to send real transactions.
   - If REACT_APP_DRY_RUN_ESCROW=true or the address is missing, escrow remains simulated.

## Ethereum Wallet & Network

Wallet connection is managed in src/hooks/useEthereumWallet.js and surfaced in src/components/WalletStatus.jsx:
- Connect: Prompts the browser wallet to connect, setting address and chainId.
- Verify: Performs a SIWE-style flow via api.getWalletNonce and api.verifyWalletSignature to establish a backend session.
- Network warnings: The app compares the wallet’s chainId to REACT_APP_CHAIN_ID (and to escrow config when provided) and displays a non-blocking warning if mismatched.

Recommended Sepolia setup:
- REACT_APP_CHAIN_ID=11155111
- REACT_APP_BLOCK_EXPLORER_BASE=https://sepolia.etherscan.io

## Escrow (Deposit/Withdraw) Flow

Primary UX is in src/components/EscrowModal.jsx, and on-chain helpers in src/services/blockchain.js:
- Initiate: The app calls api.initiateWager({ opponentId, wagerEth }) to reserve a wager and obtain an ID.
- Deposit: The app creates a BlockchainClient with the signer and escrow config, then calls deposit({ wagerId, amountEth }).
  - Dry-run: Returns a synthetic txHash instantly after a short delay.
  - Real: Sends a transaction to deposit(uint256) payable on the escrow contract. Replace the placeholder ABI once finalized.
- Notify: After a successful real deposit, the app calls api.depositNotify({ id, txHash, amountEth }) and may call api.confirmWager({ id }) depending on backend semantics.
- Status: The app polls api.getEscrowStatus({ wagerId }) to detect readiness. A block explorer link is shown if REACT_APP_BLOCK_EXPLORER_BASE is set.

Withdrawals/refunds are not yet implemented in the UI. Add contract support and API routes, then expose actions next to open wagers as needed.

## Matchmaking & Wager Filtering

Profiles and filtering are implemented in:
- Profiles: src/components/ProfileList.jsx uses api.getProfiles with optional minWager and maxWager.
- Filter: src/components/WagerFilter.jsx manages a min/max ETH range with immediate preset buttons. The store keeps the active filter, and ProfileList applies it client-side and server-side for consistency.

To challenge a profile, the user opens EscrowModal with the selected opponent and proceeds through initiate and deposit steps.

## Clash Royale Account Linking

The linking flow is implemented in src/components/LinkAccountModal.jsx:
- Users can link via player tag or API token. The modal validates basic format locally.
- The modal requires a verified wallet session unless an external onSubmit handler is provided (e.g., tests).
- API endpoints: api.crLink({ tag, token }) and api.getCRMe().
- After linking, the app fetches the linked profile and stores it.

## Game History & Live Wagers

- History: api.getWagerHistory returns the user’s wager history, rendered by GameHistoryDashboard and GameHistoryPage. Periodic refresh is enabled.
- Live wagers: api.getLiveWagers feeds the live ticker in GameHistoryPage. In mock mode, a rotating stream is synthesized for UX.

## Environment and Error Handling Details

- Mock API mode is determined in src/services/api.js by the absence of REACT_APP_API_URL and non-production NODE_ENV.
- Dry-run escrow mode is determined in src/services/blockchain.js by REACT_APP_DRY_RUN_ESCROW=true or a missing REACT_APP_ESCROW_ADDRESS.
- The app logs warnings for invalid or missing environment values in development and provides friendly UI errors for common wallet issues (rejected signature, wrong network, insufficient funds).

## API Contracts (Assumed)

The frontend assumes the following JSON endpoints and error shapes. Align these with your backend:

Error format
- JSON: { code: string, message: string, details?: any }
- Examples:
  - { code: "UNAUTHORIZED", message: "Not authenticated" }
  - { code: "VALIDATION_ERROR", message: "Invalid input", details: { field: "wagerEth" } }
  - { code: "ESCROW_MISMATCH", message: "Deposit amount incorrect" }

Session and authentication
- POST /auth/wallet-nonce
- POST /auth/wallet-verify
- GET /me

Clash Royale linking
- POST /cr/link
- GET /cr/me
- Optional read-only passthroughs: /cr/player, /cr/player/favorites

Profiles
- GET /profiles?minWager&maxWager&cursor

Wagers
- GET /wagers/live
- GET /wagers/history
- POST /wagers/initiate
- POST /wagers/:id/deposit
- POST /wagers/:id/confirm
- POST /wagers/:id/cancel
- POST /wagers/:id/result

Escrow helpers
- GET /escrow/config
- GET /escrow/:wagerId/status

Status transitions
- initiate -> awaiting-deposits -> ready -> in-progress -> completed
- Cancellable prior to completion

## Security Notes

- Never expose private keys or API tokens in the frontend or in repository config.
- Validate all wallet signatures server-side and enforce nonce expiry.
- Sanitize and authenticate all backend requests; never trust client-calculated outputs.
- Treat dry-run outputs as non-authoritative and clearly mark UI elements as simulated.

## TODO

- Replace placeholder ABI and contract method names in blockchain.js once the escrow contract stabilizes.
- Align all endpoint paths and field names with the backend.
- Add withdrawal/refund flows when defined by the contract and backend.
- Consider server-sent events or websockets for live wager updates.

