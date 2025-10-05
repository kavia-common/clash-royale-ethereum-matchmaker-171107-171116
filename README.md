# Clash Royale Ethereum Matchmaker

This repository contains the frontend React application for browsing players, linking Clash Royale accounts, and arranging Ethereum wagers with escrow.

Quick Start (Frontend)
- Preview mode requires no backend or contract. See frontend/README.md for local setup.
- For endpoint payloads and schemas, see frontend/INTEGRATION_NOTES.md (source of truth).

Backend roadmap (concise and actionable)
This section outlines the minimum viable backend needed to support the current frontend. For API shapes and data schemas, refer to frontend/INTEGRATION_NOTES.md and frontend/INTEGRATION_SUPERCELL_CR.md.

1) Authentication (SIWE-lite)
- Flow:
  1. GET /auth/nonce → returns a nonce with short expiry (e.g., 5 minutes).
  2. Client signs: “Login to CR-ETH Matchmaker. Nonce: <nonce>”.
  3. POST /auth/verify { address, signature, nonce } → verify signature; issue session token (JWT) via HTTP-only Secure cookie or Bearer token.
- Tokens:
  - JWT claims: sub=wallet address, iat, exp (e.g., 24h), jti. Consider short-lived tokens and logout revocation if needed.
- Security:
  - Nonce is one-time use and stored hashed; enforce expiry.
  - Rate-limit auth endpoints; restrict CORS to frontend origin(s).
  - Prefer SameSite=Lax/Strict cookies for session, Secure in HTTPS.

2) Profiles listing/filtering with pagination
- Endpoints:
  - GET /profiles?minWager=…&maxWager=…&tier=…&q=…&page=…&pageSize=… → { items, page, pageSize, total }.
  - GET /profiles/:walletAddress → single profile.
  - PATCH /profiles/me (auth) → update profile (display name, tier, min/max wager, availability/region).
- DB:
  - profiles(id, wallet_address unique, display_name, tier, min_wager_wei, max_wager_wei, region, created_at, updated_at).
  - Indexes on wager ranges and tier for efficient filtering.

3) Clash Royale account linking (via Supercell API proxy)
- Flow:
  1. POST /link/cr/init (auth) → issue a short-lived verify code or token and instructions (see frontend/INTEGRATION_SUPERCELL_CR.md).
  2. User sets code in CR (e.g., clan desc) or uses verifyToken flow.
  3. POST /link/cr/verify (auth, { playerTag }) → backend calls Supercell API (server-side) to validate ownership.
- Security:
  - Never expose Supercell API key to the browser; store in backend env.
  - Rate-limit link/verify endpoints; store minimal profile metadata.
- Data:
  - cr_accounts(id, wallet_address fk, player_tag, verified_at, last_check_at, metadata_json).

4) Wagers lifecycle (escrow-backed)
- State machine:
  - created → both_deposited → ready → in_progress → result_reported → settled | disputed
- On-chain escrow:
  - Deposits happen via the contract; backend tracks via events (indexer/webhook).
- Endpoints:
  - POST /wagers (auth) → { opponentAddress, stakesWei, tier, terms } → returns wagerId and state.
  - GET /wagers?status=…&page=… → list wagers for current user.
  - GET /wagers/:id → details incl. deposit confirmations for both parties.
  - POST /wagers/:id/ready (auth) → mark user ready once deposit seen.
  - POST /wagers/:id/result (auth) → { winnerAddress, evidenceUrl? }.
  - POST /wagers/:id/settle (auth/admin) → trigger on-chain settlement or mark finalization per contract design.
- Data:
  - wagers(id, creator_wallet, opponent_wallet, stakes_wei, tier, state, created_at,…)
  - wager_deposits(wager_id fk, wallet_address, tx_hash, amount_wei, confirmed_at)
  - wager_results(wager_id fk, reporter_wallet, winner_wallet, evidence_url, reported_at)

5) Webhooks/indexer to sync escrow contract events
- Options:
  - Webhook: Hosted node event webhook → POST /webhooks/escrow-events (validate HMAC).
  - Indexer: Background worker subscribes to contract events (DepositMade, Ready, ResultSubmitted, Settled).
- Reliability:
  - Track last processed block; idempotent upserts using txHash+logIndex; retries with backoff.

6) Security (must-haves)
- Nonce: single-use with expiry; store hashed.
- JWT: short-lived, rotate if needed; use HTTP-only, Secure, SameSite cookies; support logout.
- CORS: allow only known frontend origins with credentials.
- Input validation: validate/sanitize bodies and queries (zod/celebrate or pydantic).
- Rate limiting: especially for auth, link, and wager creation/settlement.
- Audit logging: auth events, CR link attempts, wager state transitions with request IDs and wallet addresses.
- Secrets: keep DB creds, JWT secret, Supercell key, RPC URL in env vars; principle of least privilege.

7) Dev setup
- docker-compose:
  - Services: api, db (Postgres), optional worker/indexer.
  - Expose api on 8080 (configurable).
- Seeding:
  - Seed profiles and sample wagers locally via utils/seed.* script.
- Local run:
  - Provide .env.example and scripts/start_dev.sh or Makefile target.
  - Use migrations (Prisma/Alembic) to bootstrap schema.

8) Suggested tech stack
- Option A (Node):
  - Node.js + Express (or Nest), Prisma ORM + PostgreSQL.
  - jsonwebtoken, cookie-parser, cors, zod/celebrate, rate-limiter-flexible.
  - Ethers.js for indexer/ABI event subscriptions.
- Option B (Python):
  - FastAPI, SQLAlchemy + Alembic + PostgreSQL.
  - PyJWT, pydantic, fastapi-limiter.
  - web3.py for event subscriptions.

9) Example endpoint list (mirrors frontend/INTEGRATION_NOTES.md)
- Auth:
  - GET /auth/nonce
  - POST /auth/verify
  - POST /auth/logout
- Profiles:
  - GET /profiles
  - GET /profiles/:walletAddress
  - PATCH /profiles/me
- Linking:
  - POST /link/cr/init
  - POST /link/cr/verify
  - Optional read-only: GET /cr/player?tag=#TAG, GET /cr/player/favorites?tag=#TAG
- Wagers:
  - POST /wagers
  - GET /wagers
  - GET /wagers/:id
  - POST /wagers/:id/ready
  - POST /wagers/:id/result
  - POST /wagers/:id/settle
  - Optional compatibility: POST /wagers/deposit, GET /wagers/:id/status, GET /wagers/live, GET /wagers/history
- Webhooks:
  - POST /webhooks/escrow-events
For exact request/response schemas, see frontend/INTEGRATION_NOTES.md.

10) Environment variables and frontend mapping
Backend .env (example)
- APP_PORT=8080
- NODE_ENV=development
- DATABASE_URL=postgresql://user:pass@db:5432/cr_eth
- JWT_SECRET=…
- NONCE_TTL_SECONDS=300
- CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.example.com
- SUPERCELL_API_BASE=https://api.clashroyale.com/v1
- SUPERCELL_API_KEY=…
- ESCROW_CONTRACT_ADDRESS=0x…
- RPC_URL=…
- WEBHOOK_HMAC_SECRET=…
- INDEXER_FROM_BLOCK=0

Frontend mapping
- REACT_APP_API_URL → http(s)://<backend-host>:<APP_PORT>
- REACT_APP_ESCROW_ADDRESS → mirrors ESCROW_CONTRACT_ADDRESS (if frontend interacts on-chain)
- REACT_APP_DRY_RUN_ESCROW → set to "false" when real escrow is enabled; otherwise "true"
- REACT_APP_CHAIN_ID → must match the deployed escrow network chain ID
- Frontend uses credentials: "include" for auth; backend must set CORS to allow origin + credentials.

Dev quickstart (Backend)
- Create backend folder/repo with chosen stack.
- Add docker-compose.yml:
  - postgres with persistent volume
  - api service building backend; ports 8080:8080; depends_on db
- Provide .env.example using variables above and a seed script.
- Implement endpoints as above; strictly follow frontend/INTEGRATION_NOTES.md schemas.
- Run frontend with REACT_APP_API_URL pointing to backend; ensure CORS and cookies are configured.

Next steps to integrate with the current frontend
- Implement /auth/nonce and /auth/verify first to unblock wallet login.
- Implement GET /profiles with pagination and filters to power listing and WagerFilter.
- Implement CR linking (POST /link/cr/init, /link/cr/verify) and configure SUPERCELL_API_KEY.
- Implement wagers endpoints; start with create/list/detail; add result/settle next.
- Stand up minimal indexer/webhook to record deposits → transition to both_deposited/ready.
- Wire CORS (allow credentials) and JWT cookie issuance; set REACT_APP_API_URL in frontend .env.
- Add a staging env with a testnet escrow contract for end-to-end testing.

References
- Frontend integration guide: frontend/INTEGRATION_NOTES.md
- Clash Royale integration notes: frontend/INTEGRATION_SUPERCELL_CR.md
