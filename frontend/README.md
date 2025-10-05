# Clash Royale Ethereum Matchmaker - Frontend

Interactive React frontend with mock API and dry‑run escrow for preview on port 3000.

## Quick start (Preview mode)

Preview mode requires no backend or smart contract.

1) Install dependencies:
   - npm install
2) Start the dev server:
   - npm start
3) Open:
   - http://localhost:3000

Default behavior (no .env needed):
- Mock API is used because REACT_APP_API_URL is not set.
- Escrow deposits are simulated (dry‑run) because REACT_APP_DRY_RUN_ESCROW=true (by default in example) or REACT_APP_ESCROW_ADDRESS is not set.

Indicators:
- The UI shows banners when mock API and/or dry‑run escrow are active.
- No real funds are used in preview mode.

## Switching to a real backend and contract

1) Copy and edit environment variables:
   - cp .env.example .env
   - Set REACT_APP_API_URL to your backend base URL.
   - Set REACT_APP_ESCROW_ADDRESS to your deployed escrow contract address.
   - Set REACT_APP_DRY_RUN_ESCROW=false to enable real deposits.
   - Set REACT_APP_CHAIN_ID to your target network (default in code is 11155111 for Sepolia).

2) Restart the dev server after editing .env.

3) Backend requirements:
   - Must implement endpoints listed in INTEGRATION_NOTES.md.
   - Enable CORS for your frontend origin and allow credentials (cookies).
   - Serve over HTTPS in staging/production; set HttpOnly, Secure cookies.

4) Contract requirements:
   - Provide the escrow contract ABI and wire it into src/services/blockchain.js.
   - Ensure MetaMask is connected to the chain matching REACT_APP_CHAIN_ID.

## MetaMask and network checks

- On connect, the app checks the wallet’s chain against REACT_APP_CHAIN_ID.
- If networks don’t match, MetaMask may prompt to switch; otherwise, switch networks in MetaMask manually.
- For preview without a wallet, the app falls back to a mock account when no API URL is set.

## Environment variables

All variables supported by the frontend:

- REACT_APP_API_URL
  - Backend base URL. If omitted, the app uses the Mock API client.
- REACT_APP_DRY_RUN_ESCROW
  - "true" to simulate escrow deposits and confirmations. Also enabled automatically if REACT_APP_ESCROW_ADDRESS is not set.
- REACT_APP_ESCROW_ADDRESS
  - Escrow contract address for real deposits. Leave empty for preview/dry‑run.
- REACT_APP_CHAIN_ID
  - Target chain ID (number). Default used in code is 11155111 (Sepolia).

See .env.example for a template.

## Additional documentation

- INTEGRATION_NOTES.md: Backend endpoints, SIWE‑lite session flow, escrow assumptions, security/CORS, and deployment guidance.
- src/services/api.js and src/services/blockchain.js: Implementation details for API and escrow client.
- src/hooks/useEthereumWallet.js: Wallet connection and SIWE‑lite logic.

## Features

- Wallet connect/disconnect with mock SIWE‑like flow.
- Profiles list with wager filtering.
- Escrow modal with dry‑run simulation.
- Deposits dashboard and game history.
- Ocean Professional theme and accessible UI primitives.

## Development

- Components and services are documented with PUBLIC_INTERFACE markers.
- Tests pass in CI using mock mode; no external services are required.

## Alignment with backend roadmap

Refer to the workspace README’s Backend Roadmap for the concise execution plan covering:
- SIWE‑lite auth, profiles, Clash Royale linking,
- wagers lifecycle with escrow + indexer/webhooks,
- security, docker‑compose dev setup, suggested stack,
- endpoint list, env var mapping, and next steps.

## Optional Express-based Mock API Server

You can optionally run a standalone mock backend that supports multi-user state beyond the built-in frontend mock mode.

- Start the server:
  - npm run mock:api
  - It listens on http://localhost:4000

- Point the frontend at it:
  - macOS/Linux: export REACT_APP_API_URL=http://localhost:4000 && npm start
  - Windows (PowerShell): $env:REACT_APP_API_URL="http://localhost:4000"; npm start

- Implemented endpoints (see INTEGRATION_NOTES.md for shapes/mapping):
  - POST /auth/nonce
  - POST /auth/verify
  - GET /profiles
  - GET /cr/me
  - POST /cr/link
  - DELETE /cr/link
  - POST /wagers/initiate
  - POST /wagers/:id/deposit-notify
  - POST /wagers/:id/confirm
  - GET /wagers/live
  - GET /wagers/history
  - GET /wagers/:id/status

Notes:
- This is opt-in and does not replace the in-frontend mock mode.
- Data is in-memory; restart resets state.
