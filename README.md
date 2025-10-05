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

2) Profiles
- Endpoints:
  - GET /profiles?minWagerWei=&maxWagerWei=&tier=&q=&page=&pageSize= → { items, page, pageSize, total }.
  - GET /profiles/:walletAddress → single profile.
  - PATCH /profiles/me (auth) → update displayName, tier, min/max wager, region.
- DB:
  - profiles(id, wallet_address unique, display_name, tier, min_wager_wei, max_wager_wei, region, created_at, updated_at, cr_link_verified boolean).
  - Index ranges and tier; cap pageSize; validate bounds.

3) Clash Royale account linking (via Supercell API proxy)
- Flow:
  1. POST /link/cr/init (auth) → issue a short-lived verify code/token with instructions (see frontend/INTEGRATION_SUPERCELL_CR.md).
  2. User sets code in CR (e.g., profile/clan message) or uses verifyToken flow if supported.
  3. POST /link/cr/verify (auth, { playerTag }) → backend calls Supercell API (server-side) to validate ownership; on success set cr_link_verified=true.
  4. DELETE /link/cr (auth) → unlink.
- Security:
  - Never expose Supercell API key to the browser; keep in backend env.
  - Rate-limit link/verify; audit-log attempts.
- Data:
  - cr_accounts(id, wallet_address fk, player_tag, verified_at, last_check_at, metadata_json).

4) Wagers lifecycle with escrow
- State machine (suggested):
  - created → awaiting_deposits → ready → in_progress → result_reported → settled | disputed | canceled
- On-chain escrow:
  - Deposits occur via the contract; backend tracks via events (indexer/webhook) and updates state.
- Endpoints:
  - POST /wagers (auth) → { opponentAddress, amountWei, tier, terms } → creates wager (state=created).
  - GET /wagers?status=&page= → list wagers for current user.
  - GET /wagers/:id → details incl. deposit statuses.
  - POST /wagers/:id/ready (auth) → mark user ready once deposit event observed.
  - POST /wagers/:id/result (auth) → { winnerAddress, evidenceUrl? } (soft report; on-chain settlement authoritative).
  - POST /wagers/:id/cancel (auth) → cancel before both deposits; enforce rules.
- Data:
  - wagers(id, creator_wallet, opponent_wallet, amount_wei, tier, state, created_at, updated_at)
  - wager_deposits(wager_id fk, wallet_address, tx_hash, amount_wei, confirmed_at)
  - wager_results(wager_id fk, reporter_wallet, winner_wallet, evidence_url, reported_at)

5) Webhooks / Indexer
- Options:
  - Webhook receiver: POST /webhooks/escrow-events (validate HMAC signature).
  - Lightweight indexer: subscribe/poll for contract events (DepositMade, Ready, Settled).
- Reliability & safety:
  - Track last processed block; idempotent upserts using (txHash, logIndex).
  - Retries with backoff; audit-log every state transition.
  - Allowlist webhook sources; confirmations threshold (e.g., 2 blocks).

6) Security checklist
- Nonce expiry and single-use; store hashed nonces.
- JWT/session with rotation; HttpOnly + Secure cookies; CSRF strategy as needed.
- Strict CORS: allow only known frontend origins; enable credentials if using cookies.
- Input validation: zod/class-validator; centralized error handling.
- Rate limits on auth, profile search, linking, and wagers.
- Audit logging: auth, linking, wagers state changes (with request IDs, wallet addresses).
- Secret management via env; minimal PII storage.
- Chain safety: chainId validation, min stake thresholds, reorg handling, replay protection.

7) Dev setup (docker-compose)
- Services: api (Node), db (PostgreSQL), optional worker/indexer, optional redis.
- API on port 8080 by default.
- Prisma (or equivalent) migrations; seed script to create sample profiles and wagers.
- Makefile or npm scripts for up/down/logs/migrate/seed.

8) Suggested backend stack
- Node + TypeScript (Fastify recommended). Alternatives: Express/Nest.
- ORM: Prisma + PostgreSQL (SQLite acceptable for local prototyping).
- Auth: ethers.js signature verification; cookie-session or JWT with cookies.
- Validation: zod (+ zod-openapi optional).
- Web3: viem or ethers v6.
- Jobs/indexer: bullmq or simple poll/subscribe loop.
- Logging: pino.
- Testing: vitest/jest + supertest; mock chain interactions.

9) Endpoint list (aligned with frontend/INTEGRATION_NOTES.md)
- Auth:
  - GET /auth/nonce
  - POST /auth/verify
  - GET /auth/me
  - POST /auth/logout
- Profiles:
  - GET /profiles
  - GET /profiles/:walletAddress
  - PATCH /profiles/me
- Clash Royale link:
  - POST /link/cr/init
  - POST /link/cr/verify
  - DELETE /link/cr
- Wagers:
  - POST /wagers
  - GET /wagers
  - GET /wagers/:id
  - POST /wagers/:id/ready
  - POST /wagers/:id/result
  - POST /wagers/:id/cancel
- Webhooks/Indexer:
  - POST /webhooks/escrow-events
- Health:
  - GET /healthz
  - GET /readyz

10) Environment variables mapping
- Core
  - NODE_ENV=development|production
  - PORT=8080
  - FRONTEND_ORIGIN=http://localhost:3000
- Database
  - DATABASE_URL=postgresql://user:pass@db:5432/app
- Auth
  - SESSION_SECRET=change_me
  - AUTH_NONCE_TTL_SECONDS=300
- Clash Royale
  - CR_API_BASE=https://api.clashroyale.com/v1
  - CR_API_TOKEN=supercell_api_token
  - CR_LINK_TOKEN_TTL_SECONDS=600
- Chain
  - CHAIN_ID=11155111 (example: Sepolia)
  - RPC_URL=https://...
  - ESCROW_FACTORY_ADDRESS=0x...
  - CONFIRMATIONS=2
- Indexer/Jobs
  - INDEXER_POLL_MS=4000
  - WEBHOOK_HMAC_SECRET=...
- Optional
  - REDIS_URL=redis://redis:6379
  - LOG_LEVEL=info

11) Next steps (execution order)
- Schema + Migrations: Define profiles, wagers, deposits, results, auth nonces, CR link records.
- Auth: Implement SIWE-lite nonce/verify + cookie/JWT session; rate limits and CORS.
- Profiles: Listing and PATCH /profiles/me.
- CR Linking: init/verify via Supercell API; audit logs.
- Wagers: create/list/detail/ready/result/cancel + validations.
- Indexer/Webhooks: ingest escrow events; idempotent updates; confirmations.
- Security Hardening: validation, CSRF strategy, logging, secrets, CORS.
- Docker Compose: api/db/indexer; .env.example; seed script.
- OpenAPI: minimal spec for endpoints to ease integration.
- Tests: integration tests for auth, profiles, linking, wagers.

Dev quickstart (Backend once implemented)
- cp .env.example .env and fill values
- docker compose up -d
- Run migrations and seed:
  - docker compose exec api npm run prisma:migrate
  - docker compose exec api npm run seed
- Verify /healthz and /readyz; integrate with frontend per frontend/INTEGRATION_NOTES.md.

License
MIT
