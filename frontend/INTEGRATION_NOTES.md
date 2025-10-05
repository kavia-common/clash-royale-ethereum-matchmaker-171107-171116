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

## Data Models and Schemas

The following models represent the minimal contracts used by the frontend. Backends should adhere to these or respond with compatible fields.

### User
Represents the authenticated wallet session and optional CR link.

Schema (response shape example):
```json
{
  "address": "0xabc123...def",
  "linked": true,
  "crTag": "#ABC123",
  "name": "BlueKnight"
}
```
Source endpoints:
- GET /me/cr → { "linked": boolean, "crTag": string|null, "name": string|null }
- Auth endpoints establish the session: GET /auth/nonce, POST /auth/verify

### Profile
Represents a public profile available for matchmaking.

Schema:
```json
{
  "id": "p1",
  "crTag": "#ABC123",
  "name": "BlueKnight",
  "trophy": 6200,
  "preferredWagerEth": 0.01,
  "availability": "Evenings",
  "online": true,
  "recentActivityMins": 42
}
```
Source endpoints:
- GET /profiles → Profile[]

Example response:
```json
[
  {
    "id": "p1",
    "crTag": "#ABC123",
    "name": "BlueKnight",
    "trophy": 6200,
    "preferredWagerEth": 0.01,
    "availability": "Evenings",
    "online": true,
    "recentActivityMins": 42
  }
]
```

### Wager (Match)
Represents a wager intent between the user and an opponent.

Schema:
```json
{
  "id": "w1",
  "opponent": {
    "id": "p1",
    "crTag": "#ABC123",
    "name": "BlueKnight",
    "trophy": 6200,
    "preferredWagerEth": 0.01,
    "availability": "Evenings"
  },
  "amountEth": 0.02,
  "status": "open",
  "createdAt": 1717439200000,
  "txHash": "0xoptionalWhenDeposited"
}
```
Allowed status values:
- open, deposit_pending, ready, in_game, settled, unknown

Source endpoints:
- POST /wagers (create)
  - Request:
    ```json
    { "opponentId": "p1", "amountEth": 0.02 }
    ```
  - Response: Wager
- POST /wagers/deposit (notify backend of on‑chain deposit)
  - Request:
    ```json
    { "wagerId": "w1", "txHash": "0xabc..." }
    ```
  - Response:
    ```json
    { "ok": true }
    ```
- GET /wagers/:id/status
  - Response:
    ```json
    { "status": "ready", "wager": { /* Wager */ } }
    ```

### LiveWager
Represents any wager that is active and not yet settled.

Schema:
```json
{
  "id": "w2",
  "opponent": { "id": "p2", "name": "AmberQueen" },
  "amountEth": 0.01,
  "status": "in_game",
  "createdAt": 1717439200000
}
```

Source endpoint:
- GET /wagers/live → LiveWager[]

Example response:
```json
[
  {
    "id": "w2",
    "opponent": { "id": "p2", "name": "AmberQueen" },
    "amountEth": 0.01,
    "status": "in_game",
    "createdAt": 1717439200000
  }
]
```

### HistoryItem
Represents a completed match with result and timestamp.

Schema:
```json
{
  "id": "h1",
  "opponent": "AmberQueen",
  "result": "win",
  "amountEth": 0.01,
  "timestamp": 1717270000000
}
```
Allowed result values:
- win, loss, draw (draw optional; frontend tolerates win/loss)

Source endpoint:
- GET /wagers/history → HistoryItem[]

Example response:
```json
[
  {
    "id": "h1",
    "opponent": "AmberQueen",
    "result": "win",
    "amountEth": 0.01,
    "timestamp": 1717270000000
  }
]
```

## Missing Backend/Services and Proposed Interfaces

The project does not include a backend or smart contracts. The frontend expects the following services when not in mock/dry‑run:

1) Authentication (SIWE‑lite compatible)
- GET /auth/nonce
  - Response: { "nonce": "string" }
- POST /auth/verify
  - Body: { "message": "string", "signature": "0x...", "address": "0x..." }
  - Response: { "ok": true, "address": "0x..." }

2) Profiles and CR Link
- GET /profiles → Profile[]
- GET /me/cr → User (subset: linked/crTag/name)
- POST /me/cr/link
  - Body: { "crTag": "string" }
  - Response: { "linked": true, "crTag": "string", "name": "string" }

3) Wagers and Status
- POST /wagers
  - Body: { "opponentId": "string", "amountEth": number }
  - Response: Wager
- POST /wagers/deposit
  - Body: { "wagerId": "string", "txHash": "0x..." }
  - Response: { "ok": true }
- GET /wagers/:id/status
  - Response: { "status": "open|deposit_pending|ready|in_game|settled|unknown", "wager"?: Wager }
- GET /wagers/live → LiveWager[]
- GET /wagers/history → HistoryItem[]

## Placeholder Escrow ABI (to be replaced)

The frontend expects a deposit entry point and relevant events. Replace this placeholder with your actual ABI in src/services/blockchain.js.

```json
[
  {
    "type": "function",
    "name": "deposit",
    "stateMutability": "payable",
    "inputs": [
      { "name": "wagerId", "type": "bytes32" }
    ],
    "outputs": []
  },
  {
    "type": "event",
    "name": "Deposited",
    "inputs": [
      { "name": "player", "type": "address", "indexed": true },
      { "name": "wagerId", "type": "bytes32", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Settled",
    "inputs": [
      { "name": "wagerId", "type": "bytes32", "indexed": true },
      { "name": "winner", "type": "address", "indexed": true }
    ],
    "anonymous": false
  }
]
```

If your contract uses different types (e.g., string wagerId), adjust the ABI and any encoding in the frontend. The deposit flow in the UI assumes:
- User signs in (SIWE‑lite)
- User calls deposit(wagerId) with msg.value equal to amountEth
- After confirmation, frontend calls POST /wagers/deposit with the resulting txHash

## Current Frontend Implementations

- API client (src/services/api.js): mock + real fetch wrappers.
- Escrow client (src/services/blockchain.js): dry‑run simulator + real scaffold.
- Wallet (src/hooks/useEthereumWallet.js): connection + SIWE‑lite.

## Contract Assumptions and Required ABIs

Expected minimal ABI elements:
- deposit(wagerId) payable
- Deposited(address player, bytes32 wagerId, uint256 amount)
- Settled(bytes32 wagerId, address winner)

Adjust types to your implementation and update:
- REACT_APP_ESCROW_ADDRESS
- ABI in src/services/blockchain.js
- Value parsing: e.g., ethers.parseEther(String(amountEth))

## Session and Auth Flow (SIWE‑lite)

1) User connects wallet; GET /auth/nonce.
2) Wallet signs message; POST /auth/verify.
3) Backend sets session; frontend uses credentials: "include".

## Mapping: Mock/Dry‑run to Real

- api.getProfiles → GET /profiles
- api.getCRMe → GET /me/cr
- api.crLink → POST /me/cr/link
- api.initWager → POST /wagers
- api.notifyDeposit → POST /wagers/deposit
- api.getWagerStatus → GET /wagers/:id/status
- api.getLive → GET /wagers/live
- api.getHistory → GET /wagers/history

- escrow.deposit (dry‑run) → contract.deposit(wagerId, { value })
  Then api.notifyDeposit({ wagerId, txHash })

## CORS and Security Considerations

- Allow origin and credentials, restrict methods/headers, use Secure HttpOnly cookies.
- Rate limit auth and wager endpoints; validate inputs; verify txHash/contract/value on backend.

## Deployment Considerations

- Preview: mock API + dry‑run escrow.
- Staging: testnet address and ABI + CORS with credentials.
- Production: HTTPS, correct chain, hardened cookies, and on‑chain verification/indexing.

## References

- Source files in this repo:
  - frontend/src/services/api.js
  - frontend/src/services/blockchain.js
  - frontend/src/hooks/useEthereumWallet.js
  - frontend/src/components/README_ESCROW.md

