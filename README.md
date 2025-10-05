# Clash Royale Ethereum Matchmaker

This repository contains the frontend React application for browsing players, linking Clash Royale accounts, and arranging Ethereum wagers with escrow.

## Quick Start

- Install and run the frontend in mock/dry‑run mode (no backend/contract required). See frontend/README.md for local setup details.
- For integration specifics, see frontend/INTEGRATION_NOTES.md.

## Backend and Contract Integration Overview

This repo does not include a backend or smart contracts. The frontend expects the following when integrating real services:

- Auth (SIWE‑lite): GET /auth/nonce and POST /auth/verify to establish a session.
- Profiles/CR link: GET /profiles, GET /me/cr, POST /me/cr/link.
- Wagers: POST /wagers, POST /wagers/deposit, GET /wagers/:id/status, GET /wagers/live, GET /wagers/history.
- Escrow contract: deposit(wagerId) payable; provide REACT_APP_ESCROW_ADDRESS and ABI in frontend/src/services/blockchain.js.

Environment variables:
- REACT_APP_API_URL
- REACT_APP_DRY_RUN_ESCROW
- REACT_APP_ESCROW_ADDRESS
- REACT_APP_CHAIN_ID (default 11155111, Sepolia)

CORS and sessions:
- Frontend requests use credentials: "include".
- Configure backend CORS to allow origin and credentials; use HTTP‑only, Secure cookies with SameSite as appropriate.

Deployment:
- Preview: mock API + dry‑run escrow.
- Staging/Prod: set API URL, escrow address, and ABI; ensure HTTPS and correct chainId.

For detailed contracts, endpoint payloads, flow mapping, and security notes, read frontend/INTEGRATION_NOTES.md.
