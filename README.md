# Clash Royale Ethereum Matchmaker

This repository contains the frontend React application for browsing players, linking Clash Royale accounts, and arranging Ethereum wagers with escrow.

Quick Start (Frontend)
- Preview mode requires no backend or contract. See frontend/README.md for local setup.
- For endpoint payloads and schemas, see frontend/INTEGRATION_NOTES.md (source of truth).

Links
- Frontend README: frontend/README.md
- Integration Notes (endpoints, flows, expectations): frontend/INTEGRATION_NOTES.md
- Supercell integration context: frontend/INTEGRATION_SUPERCELL_CR.md
- UI & style guide: assets/style_guide.md

Backend Roadmap (concise and actionable)
This section outlines the minimum viable backend needed to support the current frontend. For exact API shapes and data models, defer to frontend/INTEGRATION_NOTES.md and frontend/INTEGRATION_SUPERCELL_CR.md.

1) Authentication (SIWE-lite)
- Flow:
  1. GET /auth/nonce → returns a nonce with short expiry (e.g., 5 minutes).
  2. Client signs “Login to CR-ETH Matchmaker. Nonce: <nonce>”.
  3. POST /auth/verify { address, signature, nonce } → verify signature; issue session token (JWT) via HttpOnly Secure cookie or return Bearer token.
  4. GET /auth/me (optional) → returns session info.
  5. POST /auth/logout → revoke token/clear cookie.
- Tokens:
  - JWT claims: sub=wallet address, iat, exp (e.g., 24h), jti. Prefer rotation/short-lived tokens.
- Security:
  - Nonce is single-use, stored hashed, and expires.
  - Rate-limit auth endpoints; restrict CORS to the frontend origin(s).
  - Cookies: SameSite=Lax or None (when cross-site), Secure over HTTPS.

2) Profiles listing/filtering with pagination
- Endpoints:
  - GET /profiles?minWager=…&maxWager=…&tier=…&q=…&page=…&pageSize=… → { items, page, pageSize, total }.
  - GET /profiles/:walletAddress → single profile.
  - PATCH /profiles/me (auth) → update profile (displayName, tier, min/maxWager, availability/region).
- DB:
  - profiles(id, wallet_address unique, display_name, tier, min_wager_wei, max_wager_wei, region, created_at, updated_at, cr_link_verified boolean).
  - Indexes on wager ranges and tier; cap pageSize; validate bounds.

3) Clash Royale account linking (via Supercell API proxy)
- Flow:
  1. POST /link/cr/init (auth) → issue a short-lived verify code/token with instructions (see frontend/INTEGRATION_SUPERCELL_CR.md).
  2. User sets code in CR (e.g., profile/clan message) or uses verifyToken flow if supported.
  3. POST /link/cr/verify (auth, { playerTag }) → backend calls Supercell API (server-side) to validate ownership; on success set cr_link_verified=true.
- Security:
  - Never expose Supercell API key to the browser; keep in backend env.
  - Rate-limit link/verify; audit-log attempts.
- Data:
  - cr_accounts(id, wallet_address fk, player_tag, verified_at, last_check_at, metadata_json).

4) Wagers lifecycle (escrow-backed)
- State machine (suggested):
  - created → awaiting_deposits → ready → in_progress → result_reported → settled | disputed | canceled
- On-chain escrow:
  - Deposits occur via the contract; backend tracks via events (indexer/webhook) and updates state.
- Endpoints:
  - POST /wagers (auth) → { opponentAddress, amountWei, tier, terms } → creates wager (state=created).
  - GET /wagers?status=…&page=… → list wagers for current user.
  - GET /wagers/:id → details incl. each party’s deposit status.
  - POST /wagers/:id/ready (auth) → mark user ready once deposit event observed.
  - POST /wagers/:id/result (auth) → { winnerAddress, evidenceUrl? } (soft report; on-chain settlement authoritative).
  - POST /wagers/:id/cancel (auth) → cancel before both deposits; enforce rules.
- Data:
  - wagers(id, creator_wallet, opponent_wallet, amount_wei, tier, state, created_at, updated_at)
  - wager_deposits(wager_id fk, wallet_address, tx_hash, amount_wei, confirmed_at)
  - wager_results(wager_id fk, reporter_wallet, winner_wallet, evidence_url, reported_at)

5) Webhooks/indexer to sync escrow contract events
- Options:
  - Webhook receiver: POST /webhooks/escrow-events (validate HMAC signature).
  - Lightweight indexer: subscribe/poll for contract events (DepositMade, Ready, Settled).
- Reliability & safety:
  - Track last processed block; idempotent upserts using (txHash, logIndex).
  - Retries with backoff; audit-log every state transition.
  - Allowlist sources for webhooks where possible.

6) Security (must-haves)
- Nonce expiry and single-use; store hashed nonces.
- JWT/session with rotation; HttpOnly + Secure cookies; CSRF strategy as needed.
- Strict CORS: allow only known frontend origins; enable credentials if using cookies.
- Input validation: zod/class-validator/pydantic; centralized error handling.
- Rate limits on auth, profile search, linking, and wagers.
- Audit logging: auth, linking, wagers state changes (with request IDs, wallet addresses).
- Secret management via env; minimal PII storage.

7) Dev setup
- docker-compose:
  - Services: api, db (PostgreSQL), optional worker/indexer.
  - Expose API on 8080 (configurable).
- Migrations: Prisma or Alembic to bootstrap schema.
- Seed script:
  - Create test users/profiles with varying tiers and wager bounds.
  - Optional: mock CR link statuses.
- Local run:
  - Provide .env.example and Makefile or scripts/start_dev.sh.

8) Suggested stack
- Option A (Node):
  - Node.js + Express (or Nest), Prisma ORM + PostgreSQL.
  - jsonwebtoken, cookie-parser, cors, zod/celebrate, rate-limiter-flexible.
  - ethers.js for ABI/events and indexer.
- Option B (Python):
  - FastAPI, SQLAlchemy + Alembic + PostgreSQL.
  - PyJWT, pydantic, fastapi-limiter.
  - web3.py for ABI/events and indexer.

9) Endpoint list (aligned with frontend/INTEGRATION_NOTES.md)
- Auth:
  - GET /auth/nonce
  - POST /auth/verify
  - GET /auth/me (optional)
  - POST /auth/logout
- Profiles:
  - GET /profiles
  - GET /profiles/:walletAddress
  - PATCH /profiles/me
- CR Linking:
  - POST /link/cr/init
  - POST /link/cr/verify
- Wagers:
  - POST /wagers
  - GET /wagers
  - GET /wagers/:id
  - POST /wagers/:id/ready
  - POST /wagers/:id/result
  - POST /wagers/:id/cancel
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
- REACT_APP_DRY_RUN_ESCROW → "false" when real escrow is enabled; otherwise "true"
- REACT_APP_CHAIN_ID → must match the deployed escrow network chain ID
- Credentials: frontend uses credentials: "include" for auth; backend CORS must allow origin + credentials.

Observability
- /healthz and /readyz endpoints for liveness/readiness.
- Structured logging with correlation/request IDs.
- Basic metrics: req count, latency, error rate.

Next Steps Checklist
- [ ] Scaffold backend (Express or FastAPI) with docker-compose and Postgres
- [ ] Implement SIWE-lite: nonce, verify, session; add rate limits and CORS
- [ ] Profiles: schema, seed, GET /profiles with pagination/filtering
- [ ] CR Linking: proxy client, init + verify endpoints, audit logging
- [ ] Wagers: schema, create/list/detail/ready/result/cancel endpoints
- [ ] Webhooks/indexer: handle escrow events, idempotent updates
- [ ] Security: validation, JWT/session rotation, CSRF strategy, audit logs
- [ ] Observability: health checks, logs, metrics
- [ ] Align frontend .env with backend CORS/session and API base URL
- [ ] E2E smoke: run frontend against backend and iterate

Dev quickstart (Backend)
- Create backend folder/repo with chosen stack.
- Add docker-compose.yml:
  - postgres with persistent volume
  - api service building backend; ports 8080:8080; depends_on db
- Provide .env.example using variables above and a seed script.
- Implement endpoints as above; strictly follow frontend/INTEGRATION_NOTES.md schemas.
- Run frontend with REACT_APP_API_URL pointing to backend; ensure CORS and cookies are configured.

References
- Frontend integration guide: frontend/INTEGRATION_NOTES.md
- Clash Royale integration notes: frontend/INTEGRATION_SUPERCELL_CR.md
