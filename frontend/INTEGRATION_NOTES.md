# Integration Notes

## Overview

This frontend is production‑ready on the UI side and provides two built‑in integration modes for backend and blockchain:
- Mock API mode: active when REACT_APP_API_URL is unset. Frontend simulates profiles, wagers, and a SIWE‑like flow.
- Dry‑run escrow: active when REACT_APP_DRY_RUN_ESCROW=true or REACT_APP_ESCROW_ADDRESS is unset. Frontend simulates on‑chain deposits and tx lifecycle events.

Both modes enable interactive previews without external services. When wiring real services, replace mock behaviors with live endpoints and contract calls.

## Environment Variables

- REACT_APP_API_URL: Backend base URL. If omitted, the API client runs in mock mode.
- REACT_APP_DRY_RUN_ESCROW: "true" to simulate deposits and transaction confirmations.
- REACT_APP_ESCROW_ADDRESS: Deployed escrow contract address for real deposits.
- REACT_APP_CHAIN_ID: Numeric chain ID for the target network. Default is 11155111 (Sepolia).

Behavior switches:
- API mock mode: !REACT_APP_API_URL
- Escrow dry‑run: REACT_APP_DRY_RUN_ESCROW==="true" OR !REACT_APP_ESCROW_ADDRESS

## Missing Backend/Services and Proposed Interfaces

The project does not include a backend or smart contracts. The frontend expects the following services when not in mock/dry‑run:

1) Authentication (SIWE‑lite compatible)
- GET /auth/nonce
  - Response: { "nonce": "string" }
  - Sets/returns a nonce for message signing. Should set anti‑replay metadata server‑side (e.g., tie to IP/session).
- POST /auth/verify
  - Body: { "message": "string", "signature": "0x...", "address": "0x..." }
  - Response: { "ok": true, "address": "0x..." }
  - Verifies signature against message and nonce, establishes a session (e.g., HTTP‑only session cookie).

2) Profiles and CR Link
- GET /profiles
  - Response: [ { id, crTag, name, trophy, preferredWagerEth, availability, ... } ]
- GET /me/cr
  - Response: { "linked": boolean, "crTag": string|null, "name": string|null }
- POST /me/cr/link
  - Body: { "crTag": "string" }
  - Response: { "linked": true, "crTag": "string", "name": "string" }
  - Backend should verify CR ownership (see frontend/INTEGRATION_SUPERCELL_CR.md for CR linking guidance if applicable).

3) Wagers
- POST /wagers
  - Body: { "opponentId": "string", "amountEth": number }
  - Response: { "id": "string", "opponent": { ...profile }, "amountEth": number, "status": "open|..." , "createdAt": number }
- POST /wagers/deposit
  - Body: { "wagerId": "string", "txHash": "0x..." }
  - Response: { "ok": true }
  - Records a player deposit txHash, transitions wager state server‑side.
- GET /wagers/:id/status
  - Response: { "status": "open|deposit_pending|ready|in_game|settled|unknown", "wager"?: { ... } }
- GET /wagers/live
  - Response: [ { ...wager } ]  // active or not yet settled
- GET /wagers/history
  - Response: [ { id, opponent, result, amountEth, timestamp } ]

4) Blockchain Escrow Contract (assumptions)
- Network: chainId = REACT_APP_CHAIN_ID (default Sepolia 11155111).
- Escrow contract exposes a deposit function that accepts ETH value:
  - function deposit(bytes32 wagerId) payable
  - Emits events for deposit confirmation and settlement. Event watching may be done by backend indexer or frontend provider.
- Frontend requires:
  - Contract address: REACT_APP_ESCROW_ADDRESS
  - ABI for deposit and relevant events configured in src/services/blockchain.js
  - EOA signer via window.ethereum

If using a different function signature or data types (e.g., string wagerId, or separate struct), update frontend/src/services/blockchain.js accordingly.

## Current Frontend Implementations

- API client (src/services/api.js)
  - Mock mode: deterministic profiles, wagers, history, and auth flows. Simulates latency.
  - Real mode: simple fetch wrappers to the routes listed above using credentials: "include" and JSON bodies.

- Escrow client (src/services/blockchain.js)
  - Dry‑run: simulates tx submission, pending, and confirmation; returns a txHash‑like string.
  - Real mode: scaffold with placeholder ABI array. Must be replaced with ethers.js logic and the real ABI.

- Wallet and SIWE‑lite (src/hooks/useEthereumWallet.js)
  - Connects to Ethereum provider when available, falls back to mock account in preview without API URL.
  - Calls /auth/nonce then signs a message and calls /auth/verify. In mock it accepts any signature.

## Contract Assumptions and Required ABIs

Expected minimal ABI elements:
- deposit(wagerId) payable  // e.g., deposit(bytes32 wagerId) or deposit(string wagerId)
- Deposited(address player, bytes32 wagerId, uint256 amount)
- Settled(bytes32 wagerId, address winner)

Adjust types to your implementation and update:
- REACT_APP_ESCROW_ADDRESS
- ABI in src/services/blockchain.js
- Value parsing: e.g., ethers.parseEther(String(amountEth))

## Session and Auth Flow (SIWE‑lite)

1) User connects wallet in UI; frontend fetches GET /auth/nonce.
2) Frontend composes a human‑readable message including the nonce and requests a personal_sign.
3) Frontend POSTs { message, signature, address } to /auth/verify.
4) Backend verifies signature and nonce, then establishes a session (cookie or token).
5) Subsequent requests include credentials (cookie). Frontend fetch uses credentials: "include".

Required backend pieces:
- Nonce issuance and storage with expiry.
- Signature verification (EIP‑191 personal_sign). Consider upgrading to full SIWE if needed.
- HTTPS only, Secure + HttpOnly cookies, and SameSite configuration if cross‑site.

## Mapping: Mock/Dry‑run to Real

- api.getProfiles -> GET /profiles
- api.getCRMe -> GET /me/cr
- api.crLink -> POST /me/cr/link
- api.initWager -> POST /wagers
- api.notifyDeposit -> POST /wagers/deposit
- api.getWagerStatus -> GET /wagers/:id/status
- api.getLive -> GET /wagers/live
- api.getHistory -> GET /wagers/history

- escrow.deposit (dry‑run) -> contract.deposit(wagerId, { value })
  After tx mined, call api.notifyDeposit({ wagerId, txHash })

Replace mock/dry‑run paths once backend and contract are available. Ensure user feedback states remain consistent: review → confirm → pending → success/failure.

## CORS and Security Considerations

- CORS:
  - Allow Origin: https://your-frontend-domain or http://localhost:3000
  - Allow Credentials: true
  - Allowed Methods: GET, POST, OPTIONS
  - Allowed Headers: Content-Type, Authorization (if bearer), X-Requested-With
  - Cookie strategy: set SameSite=None; Secure for cross‑site, and enable credentials on frontend requests.

- Session/Cookies:
  - Prefer HTTP‑only, Secure cookies with short expiry and refresh flow.
  - Rotate nonces per attempt and invalidate after use or expiry.

- Rate limiting:
  - Protect /auth/nonce and /auth/verify.
  - Throttle wager creation and deposit notifications.

- Input validation:
  - Validate crTag format and opponentId existence.
  - Validate amountEth ranges server‑side.

- On‑chain safety:
  - Validate chainId equals expected target.
  - Verify txHash corresponds to expected escrow contract and value on backend before accepting deposit state change.

## Deployment Considerations

- Environments:
  - Preview: no REACT_APP_API_URL and REACT_APP_DRY_RUN_ESCROW=true
  - Staging: REACT_APP_API_URL set to staging API; REACT_APP_ESCROW_ADDRESS set to testnet; provide ABI and enable CORS with credentials
  - Production: REACT_APP_API_URL set to prod API; REACT_APP_ESCROW_ADDRESS set to mainnet/testnet as intended; enforce HTTPS

- Backend build:
  - Must implement endpoints above and attach session middleware and CORS config.
  - Consider a lightweight indexer or webhook to confirm deposits and settlements based on chain events.

- Frontend config:
  - Ensure chain prompts or network checks align with REACT_APP_CHAIN_ID.
  - Provide clear banners indicating mock/dry‑run status for user clarity.

## References

- Source files in this repo:
  - frontend/src/services/api.js
  - frontend/src/services/blockchain.js
  - frontend/src/hooks/useEthereumWallet.js
  - frontend/src/components/README_ESCROW.md

