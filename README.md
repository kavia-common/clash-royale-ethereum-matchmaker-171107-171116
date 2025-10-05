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
- Scope: Minimal backend to support the current frontend. For exact request/response shapes, always defer to frontend/INTEGRATION_NOTES.md and keep strict endpoint parity with that file.
- Compatibility: The frontend relies on GET /me/cr for CR-link status. Implement GET /me/cr and optionally expose /link/cr/* for a robust server-side linking flow. If both exist, keep /me/cr as the thin compatibility layer.

1) Authentication (SIWE-lite)
- Flow
  - GET /auth/nonce → returns a nonce (TTL ~5 minutes; single-use, stored hashed).
  - Client signs: "Login to CR-ETH Matchmaker. Nonce: <nonce>".
  - POST /auth/verify { address, signature, nonce|message } → verify; establish session (JWT in HttpOnly Secure cookie or Bearer).
  - GET /auth/me → session info (wallet address).
  - POST /auth/logout → revoke/clear session.
- Security
  - Nonce expiry + single-use; rate-limit auth; restrict CORS to known origins.
  - Cookies: HttpOnly + Secure; SameSite=Lax (or None for cross-site).
  - Consider CSRF token for state-changing routes if using cookies.
  - JWT: short-lived (≤24h) with rotation; claims: sub (wallet), iat, exp, jti.

2) Profiles (listing and filtering)
- Endpoints
  - GET /profiles?minWagerWei=&maxWagerWei=&tier=&q=&page=&pageSize= → { items, page, pageSize, total }.
  - GET /profiles/:walletAddress
  - PATCH /profiles/me (auth) → update displayName, tier, min/max wager, region.
- Data & validation
  - profiles(id, wallet_address unique, display_name, tier, min_wager_wei, max_wager_wei, region, created_at, updated_at, cr_link_verified boolean).
  - Index tier and wager ranges; cap pageSize; validate bounds and enums.

3) Clash Royale account linking (server-side via Supercell API)
- Endpoints
  - GET /me/cr → { linked, crTag, name }
  - POST /me/cr/link → { crTag } (map internally to /link/cr/* for robust verification)
  - POST /link/cr/init (auth) → issue short-lived verification token/code
  - POST /link/cr/verify (auth, { playerTag }) → call Supercell API; set cr_link_verified=true
  - DELETE /link/cr (auth) → unlink
- Security & data
  - CR API token in backend env; rate-limit; audit-log attempts.
  - cr_accounts(id, wallet_address fk, player_tag, verified_at, last_check_at, metadata_json).

4) Wagers lifecycle with escrow (on-chain + off-chain coordination)
- State machine
  - created → awaiting_deposits → ready → in_progress → result_reported → settled | disputed | canceled
- Endpoints
  - POST /wagers (auth) → { opponentAddress|opponentId, amountWei, tier, terms }
  - GET /wagers?status=&page= (current user’s wagers)
  - GET /wagers/:id
  - POST /wagers/:id/ready (auth) (after deposit event observed)
  - POST /wagers/:id/result (auth) → { winnerAddress, evidenceUrl? }
  - POST /wagers/:id/cancel (auth)
  - Compatibility shims to match frontend:
    - POST /wagers/deposit → { wagerId, txHash }
    - GET /wagers/:id/status → { status, wager? }
    - GET /wagers/live and GET /wagers/history
- Data
  - wagers(id, creator_wallet, opponent_wallet, amount_wei, tier, state, created_at, updated_at)
  - wager_deposits(wager_id fk, wallet_address, tx_hash unique, amount_wei, confirmed_at)
  - wager_results(wager_id fk, reporter_wallet, winner_wallet, evidence_url, reported_at)

5) Webhooks / Indexer
- Options
  - Webhook: POST /webhooks/escrow-events (HMAC verification).
  - Indexer: subscribe/poll for Deposited/Ready/Settled events.
- Reliability
  - Track last processed block; idempotent upserts via (txHash, logIndex).
  - Retries/backoff; audit each state transition; require N confirmations (e.g., 2).
  - Allowlist webhook sources.

6) Security checklist
- Nonce expiry + single-use; hashed storage.
- JWT/session with rotation; HttpOnly + Secure cookies; CSRF strategy as needed.
- Strict CORS: allow only known frontend origins; credentials if using cookies.
- Input validation (zod/class-validator); centralized error handling.
- Rate limits: auth, search, link, wagers.
- Audit logging: auth, linking, wagers transitions (req IDs, wallets).
- Secrets via env; least privilege; avoid PII.
- Chain safety: chainId validation, min stake, reorg handling, replay protection.

7) Dev setup (docker-compose)
- Services: api (Node/TS), db (PostgreSQL), optional worker/indexer, optional redis.
- API default port: 8080.
- Migrations via Prisma (or similar); seed script for demo data.
- Scripts: up/down/logs/migrate/seed; include .env.example.

8) Suggested backend stack
- Node + TypeScript (Fastify recommended; Express/Nest acceptable).
- ORM: Prisma + PostgreSQL (SQLite OK for local prototype).
- Auth: viem/ethers for signature checks; cookie-session or JWT.
- Validation: zod (+ zod-openapi optional).
- Web3: viem or ethers v6.
- Jobs/indexer: bullmq or simple poll/subscribe loop.
- Logging: pino.
- Testing: vitest/jest + supertest; mock chain.

9) Endpoint list (kept in lockstep with frontend/INTEGRATION_NOTES.md)
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
  - GET /me/cr
  - POST /me/cr/link
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
  - POST /wagers/deposit
  - GET /wagers/:id/status
  - GET /wagers/live
  - GET /wagers/history
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
  - REACT_APP_ESCROW_ADDRESS=0x... (frontend var shown for context)
  - CONFIRMATIONS=2
- Indexer/Jobs
  - INDEXER_POLL_MS=4000
  - WEBHOOK_HMAC_SECRET=...
- Optional
  - REDIS_URL=redis://redis:6379
  - LOG_LEVEL=info

11) Next steps (execution order)
- Schema/Migrations: profiles, wagers, deposits, results, auth nonces, CR link records.
- Auth: SIWE-lite nonce/verify + session; rate limits; CORS.
- Profiles: GET /profiles and PATCH /profiles/me.
- CR Linking: init/verify via Supercell; audit; maintain /me/cr parity.
- Wagers: create/list/detail/ready/result/cancel; add compatibility endpoints (/wagers/deposit, status, live, history).
- Indexer/Webhooks: ingest escrow events; idempotent updates; confirmations.
- Security Hardening: validation, CSRF, logging, secrets, CORS.
- Docker Compose: api/db/indexer; .env.example; seed.
- OpenAPI: minimal spec for these endpoints.
- Tests: auth, profiles, linking, wagers, webhook/indexer.

Dev quickstart (Backend once implemented)
- cp .env.example .env and fill values
- docker compose up -d
- Run migrations and seed:
  - docker compose exec api npm run prisma:migrate
  - docker compose exec api npm run seed
- Verify /healthz and /readyz; test with the frontend per frontend/INTEGRATION_NOTES.md.

License
MIT
