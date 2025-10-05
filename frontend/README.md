# Clash Royale Ethereum Matchmaker — Frontend

This React app lets users link Clash Royale accounts, browse profiles, filter by wager, initiate matches, and deposit ETH into escrow. It supports mock API and dry‑run escrow modes for rapid local development, and can be configured to use real backend services and a testnet like Sepolia.

## Project overview and features

The UI provides:
- Wallet status and network checks, with an option to switch to the expected chain.
- Profile listing with wager range filters and quick presets.
- A streamlined Link Account modal to link a Clash Royale account by player tag or token.
- An Escrow modal to initiate and complete ETH deposits required by both players.
- A Game History page with a live feed and historical wagers.

Core files:
- API client: `src/services/api.js`
- Blockchain client: `src/services/blockchain.js`
- Wallet hook: `src/hooks/useEthereumWallet.js`
- UI: `src/components/ProfileList.jsx`, `src/components/WagerFilter.jsx`, `src/components/WalletStatus.jsx`, `src/components/EscrowModal.jsx`, `src/pages/GameHistoryPage.jsx`

## Quick start (Preview vs Real integration)

Preview (no backend or contracts):
1) Install and run:
   - `cd frontend`
   - `npm install`
   - `npm start`
2) Do not set `REACT_APP_API_URL` to enable mock API mode.
3) Leave `REACT_APP_ESCROW_ADDRESS` unset or set `REACT_APP_DRY_RUN_ESCROW=true` to enable dry‑run escrow mode.
4) Open http://localhost:3000 and explore:
   - Use the Wager Filter to adjust listing ranges.
   - Click Challenge on a profile to open the Escrow modal.
   - Connect a wallet to see wallet UI; deposits are simulated in dry‑run.

Real integration (backend + testnet):
1) Create `frontend/.env` with:
   - `REACT_APP_API_URL=https://your-backend.example.com`
   - `REACT_APP_CHAIN_ID=11155111` (Sepolia)
   - `REACT_APP_ESCROW_ADDRESS=0xYourEscrowAddress`
   - Optional: `REACT_APP_BLOCK_EXPLORER_BASE=https://sepolia.etherscan.io`
   - Optional: `REACT_APP_DRY_RUN_ESCROW=false`
2) Restart `npm start` to pick up environment changes.
3) Ensure your wallet is on the expected chain; the UI will warn if mismatched.

## Configuration matrix

- Mock API mode:
  - Active when `REACT_APP_API_URL` is NOT set.
  - Profiles, live wagers, history, and SIWE‑like auth are simulated in `src/services/api.js`.
  - UI shows informational banners in places like ProfileList and WalletStatus.

- Dry‑run escrow mode:
  - Active when `REACT_APP_DRY_RUN_ESCROW=true` OR `REACT_APP_ESCROW_ADDRESS` is not set.
  - Deposits are simulated in `src/services/blockchain.js` and return synthetic tx hashes.
  - The Escrow modal displays a dry‑run banner.

- Real mode:
  - Set `REACT_APP_API_URL`, `REACT_APP_CHAIN_ID`, and `REACT_APP_ESCROW_ADDRESS`.
  - Provide the contract ABI and finalize the on‑chain call in `src/services/blockchain.js`.

## Environment variables

Set in `frontend/.env`. Only variables prefixed with `REACT_APP_` are exposed to the React app.

- `REACT_APP_API_URL`
  - Description: Backend base URL (e.g., http://localhost:8000).
  - Behavior: If omitted, the app runs in Mock API mode.

- `REACT_APP_DRY_RUN_ESCROW`
  - Description: `"true"` to simulate deposits and confirmations.
  - Behavior: Dry‑run is also active if `REACT_APP_ESCROW_ADDRESS` is not set.

- `REACT_APP_ESCROW_ADDRESS`
  - Description: Escrow contract address for real deposits (0x‑prefixed, 40 hex chars).
  - Behavior: Required for real deposits; leave empty for dry‑run.

- `REACT_APP_CHAIN_ID`
  - Description: Numeric chain ID (e.g., `11155111` for Sepolia).
  - Behavior: UI warns when the wallet is connected to a different chain.

- `REACT_APP_BLOCK_EXPLORER_BASE` (optional)
  - Description: Explorer base URL (e.g., https://sepolia.etherscan.io).
  - Behavior: Enables explorer links to transactions and addresses.

Notes:
- Keep `.env` files out of version control.
- The app logs helpful warnings in development when env vars are missing or invalid.

## Mock vs Real behavior (banners, dry‑run escrow, API fallbacks)

- Banners:
  - WalletStatus shows a banner when the app is in mock API mode or dry‑run escrow mode.
  - ProfileList displays an info banner when using deterministic mock data.

- Dry‑run escrow:
  - In `src/services/blockchain.js`, deposits return a simulated tx hash when dry‑run is active.
  - The Escrow modal displays a message indicating no real funds are used.

- API fallbacks:
  - When `REACT_APP_API_URL` is absent, `src/services/api.js` returns mock data for:
    - Profiles (getProfiles)
    - Live wagers (getLiveWagers)
    - History (getWagerHistory)
    - Link/verify flows (crLink, crMe, auth.nonce/verify)

## Ethereum wallet & network setup (chain match, switch network CTA)

- Wallet connection is managed via `src/hooks/useEthereumWallet.js`.
  - Connect: Prompts the browser wallet for accounts.
  - Optional SIWE‑like flow: The app requests a nonce and verifies a signature through `api.auth`.
- Chain/network:
  - The app compares the wallet’s `chainId` to `REACT_APP_CHAIN_ID`.
  - A warning appears for mismatched networks, and a “Switch Network” CTA is shown when supported.
- Recommended testnet (Sepolia):
  - `REACT_APP_CHAIN_ID=11155111`
  - `REACT_APP_BLOCK_EXPLORER_BASE=https://sepolia.etherscan.io`

## Expected backend endpoints and payloads

The UI uses the following endpoints when `REACT_APP_API_URL` is set. Shapes are described in detail in `frontend/INTEGRATION_NOTES.md`.

Auth/session:
- `POST /auth/wallet-nonce` → `{ nonce }`
- `POST /auth/wallet-verify` → `{ ok: true, user: { id, address } }`
- `GET /me` → `{ id, address }`

Clash Royale linking:
- `POST /cr/link` → `{ ok: true, linked: true, tag?: string }`
- `GET /cr/me` → `CRProfile`

Profiles:
- `GET /profiles?minWager&maxWager&cursor` → `{ items: UserProfile[], nextCursor?: string }`

Wagers:
- `GET /wagers/live` → `{ items: Wager[] }` or `Wager[]`
- `GET /wagers/history` → `{ items: GameHistoryItem[] }` or `GameHistoryItem[]`
- `POST /wagers/initiate` → `{ id: string, status: "initiated" | "awaiting-deposits" }`
- `POST /wagers/:id/deposit` → `{ ok: true, status: ... }`
- `POST /wagers/:id/confirm` → `{ ok: true, status: "ready" | "in-progress" }`
- `POST /wagers/:id/cancel` → `{ ok: true, status: "cancelled" }`
- `POST /wagers/:id/result` → `{ ok: true, status: "completed" }`

Escrow helpers:
- `GET /escrow/config` → `{ escrowAddress, chainId, minWagerEth?, maxWagerEth? }`
- `GET /escrow/:wagerId/status` → `{ wagerId, status, deposits: {...} }`

See `frontend/INTEGRATION_NOTES.md` for complete models, error shapes, and flow details.

## Escrow contract notes and explorer links

- Real mode:
  - `src/services/blockchain.js` expects a `deposit(uint256 wagerId) payable` function and uses ethers.js.
  - Replace the placeholder ABI with the actual contract ABI.
- Dry‑run mode:
  - Controlled by `REACT_APP_DRY_RUN_ESCROW=true` or missing `REACT_APP_ESCROW_ADDRESS`.
  - Returns synthetic tx hashes and marks receipts as simulated.
- Explorer links:
  - Set `REACT_APP_BLOCK_EXPLORER_BASE` (e.g., `https://sepolia.etherscan.io`).
  - The blockchain client builds transaction links via `formatTxLink`.

## Troubleshooting

- Mock data instead of backend:
  - Cause: `REACT_APP_API_URL` not set (mock mode).
  - Fix: Provide a valid API base URL in `.env` and restart.

- Deposits simulate instead of sending real tx:
  - Cause: `REACT_APP_DRY_RUN_ESCROW=true` or `REACT_APP_ESCROW_ADDRESS` not set.
  - Fix: Set `REACT_APP_DRY_RUN_ESCROW=false` and configure `REACT_APP_ESCROW_ADDRESS`.

- Wrong network:
  - Symptom: WalletStatus shows a network mismatch banner.
  - Fix: Switch your wallet to `REACT_APP_CHAIN_ID`. A “Switch Network” button is shown when supported.

- No wallet detected:
  - Symptom: Connect button errors.
  - Fix: Install MetaMask or another EIP‑1193 wallet provider.

- API errors (401/403):
  - Symptom: Protected routes fail.
  - Fix: Complete wallet verification (nonce + signature) and ensure cookies/tokens are accepted by the backend (CORS with credentials).

- Missing explorer links:
  - Symptom: No link shown after a successful tx.
  - Fix: Provide `REACT_APP_BLOCK_EXPLORER_BASE` in `.env`.

## Safety disclaimer (no real funds in dry‑run)

When dry‑run is active, all escrow deposits are simulated. No real transactions are submitted and no real funds are moved. Always verify:
- You are connected to the correct chain (`REACT_APP_CHAIN_ID`).
- `REACT_APP_ESCROW_ADDRESS` is the intended contract address before enabling real deposits.
- The ABI and method signature in `src/services/blockchain.js` match your deployed contract.

## Scripts

- `npm start`: Run the app locally at http://localhost:3000
- `npm test`: Run the test suite
- `npm run build`: Build production assets

## Additional documentation

- `frontend/INTEGRATION_NOTES.md`: Backend endpoints, models, SIWE‑like flow, escrow assumptions, and deployment notes.
- `src/services/api.js` and `src/services/blockchain.js`: The API and escrow client implementations.
- `src/hooks/useEthereumWallet.js`: Wallet connection, chain checks, and optional signature flow.

