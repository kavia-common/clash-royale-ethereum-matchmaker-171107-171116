# Frontend Integration Notes

This document captures the assumed backend API contracts and domain models for the Clash Royale Ethereum Matchmaker frontend. These contracts drive the typed wrappers in `src/services/api.js` and the on‑chain helpers in `src/services/blockchain.js`.

IMPORTANT
- These endpoints are assumptions for scaffolding. Please align with your backend team and adjust as needed.
- Errors follow a consistent JSON shape: { code, message, details? }.
- See inline TODOs in service files referencing this document for follow-ups.

Environment variables
- REACT_APP_API_URL: Base URL for backend (e.g., http://localhost:8000)
- REACT_APP_ESCROW_ADDRESS: Escrow contract address on current chain.
- REACT_APP_CHAIN_ID: Expected chain id (hex or decimal) used by UI to warn on wrong network.
- REACT_APP_BLOCK_EXPLORER_BASE: Optional base URL for block explorer (e.g., https://etherscan.io)

Error format
- JSON: { code: string, message: string, details?: any }
- Examples:
  - { code: "UNAUTHORIZED", message: "Not authenticated" }
  - { code: "VALIDATION_ERROR", message: "Invalid input", details: { field: "wagerEth" } }
  - { code: "ESCROW_MISMATCH", message: "Deposit amount incorrect" }

Domain models (frontend typedefs)
- UserProfile: { id: string, username: string, rank?: string, avatarUrl?: string, wagerEth: number }
- Wager:
  {
    id: string,
    status: "initiated" | "awaiting-deposits" | "ready" | "in-progress" | "completed" | "cancelled",
    players: { challenger: string, opponent: string },
    amounts: { challengerEth: number, opponentEth: number, totalEth?: number },
    createdAt: string, updatedAt?: string
  }
- GameHistoryItem:
  { id: string, date: string, opponent: string, wagerEth: number,
    result: "win" | "loss" | "draw" | "cancelled", profitEth?: number }
- CRProfile: Minimal subset for UI:
  {
    tag: string, name: string, trophies?: number, bestTrophies?: number,
    expLevel?: number, wins?: number, losses?: number, clan?: { name?: string }
  }

Session and authentication
- POST /auth/wallet-nonce
  Purpose: Request a nonce to sign with the user's wallet for authentication.
  Request: { address: string }
  Response: { nonce: string, expiresInSec?: number }
  Errors: { code: "RATE_LIMIT" | "INVALID_ADDRESS", message, details? }

- POST /auth/wallet-verify
  Purpose: Verify a signed nonce and establish a session (cookie or token).
  Request: { address: string, signature: string }
  Response: { ok: true, user: { id, address }, token?: string }
  Errors: { code: "INVALID_SIGNATURE" | "EXPIRED_NONCE" | "UNAUTHORIZED", message, details? }

- GET /me
  Purpose: Return session user.
  Response: { id: string, address: string, crLinked?: boolean } (Add fields as needed)
  Errors: { code: "UNAUTHORIZED", message }

Clash Royale linking
- POST /cr/link
  Purpose: Link Clash Royale account to the session user.
  Request: { tag?: string, token?: string } (One of tag or token required)
  Response: { ok: true, linked: true, tag?: string }
  Errors: { code: "INVALID_TAG" | "INVALID_TOKEN" | "UNAUTHORIZED", message, details? }

- GET /cr/me
  Purpose: Get the linked Clash Royale profile for the current user.
  Response: CRProfile
  Errors: { code: "NOT_LINKED" | "UNAUTHORIZED", message }

Profiles
- GET /profiles?minWager&maxWager&cursor
  Purpose: List profiles of users open to wagers within the specified range.
  Query:
    - minWager?: number
    - maxWager?: number
    - cursor?: string (opaque pagination token)
  Response: { items: UserProfile[], nextCursor?: string }
  Errors: { code: "BAD_REQUEST", message, details? }

Wagers
- GET /wagers/live
  Purpose: List currently live or open wagers.
  Response: { items: Wager[], updatedAt?: string }

- GET /wagers/history
  Purpose: List wager history for the authenticated user.
  Response: { items: GameHistoryItem[], stats?: { wins: number, losses: number, totalProfitEth?: number } }

- POST /wagers/initiate
  Purpose: Create a new wager intent with an opponent.
  Request: { opponentId: string, wagerEth: number }
  Response: { id: string, status: "initiated" | "awaiting-deposits" }
  Errors: { code: "UNAUTHORIZED" | "VALIDATION_ERROR" | "OPPONENT_UNAVAILABLE", message }

- POST /wagers/:id/deposit
  Purpose: Notify backend that a deposit transaction hash has been submitted or confirmed on-chain.
  Request: { txHash: string, amountEth?: number }
  Response: { ok: true, status: "awaiting-deposits" | "ready" }

- POST /wagers/:id/confirm
  Purpose: Organizer/admin or automated validator confirms both deposits and moves to ready/in-progress.
  Request: {}
  Response: { ok: true, status: "ready" | "in-progress" }

- POST /wagers/:id/cancel
  Purpose: Cancel a wager prior to completion.
  Request: { reason?: string }
  Response: { ok: true, status: "cancelled" }

- POST /wagers/:id/result
  Purpose: Post match result and distribute escrow accordingly.
  Request: { result: "challenger" | "opponent" | "draw", proof?: any }
  Response: { ok: true, status: "completed" }

Escrow helpers
- GET /escrow/config
  Purpose: Provide escrow configuration to clients (addresses, supported chainId, min/max wager).
  Response: {
    escrowAddress: string,
    chainId: string | number,
    minWagerEth?: number,
    maxWagerEth?: number
  }

- GET /escrow/:wagerId/status
  Purpose: Return on-chain and backend view of escrow status for a wager id.
  Response: {
    wagerId: string,
    status: "initiated" | "awaiting-deposits" | "ready" | "in-progress" | "completed" | "cancelled",
    deposits: { challenger?: { txHash?: string, confirmed?: boolean }, opponent?: { txHash?: string, confirmed?: boolean } }
  }

Status transitions
- initiate -> awaiting-deposits (first deposit posted)
- awaiting-deposits -> ready (both deposits confirmed)
- ready -> in-progress (match start)
- in-progress -> completed (result posted and validated)
- any pre-completion state -> cancelled (cancel flow)
- Post-completion is terminal.

Notes
- All endpoints return JSON and error responses follow {code, message, details?}.
- Auth may be managed via cookies or Bearer tokens; the frontend service adds Authorization header if configured.
- The frontend wrappers in src/services/api.js are typed with JSDoc typedefs for the above models.
- The blockchain client in src/services/blockchain.js assumes a deposit(uint256) payable ABI; update ABI and methods as soon as the contract is finalized.

TODO
- Replace placeholder ABI/methods in blockchain.js once final contract is available.
- Align all endpoint paths/fields with backend implementation once available.
- Consider server-sent events or websockets for wager status updates post-deposit confirmation.
