# Integration Notes

This frontend supports mock mode and dry-run escrow for interactive previews without a backend.

- Mock API mode: active when `REACT_APP_API_URL` is unset.
- Dry-run escrow: active when `REACT_APP_DRY_RUN_ESCROW=true` or `REACT_APP_ESCROW_ADDRESS` is unset.
- Target chain: `REACT_APP_CHAIN_ID` (default 11155111).

Environment variables required:
- REACT_APP_API_URL: Backend base URL (optional; omit for mock mode).
- REACT_APP_DRY_RUN_ESCROW: "true" to simulate deposits.
- REACT_APP_ESCROW_ADDRESS: Deployed escrow contract address (real mode).
- REACT_APP_CHAIN_ID: Numeric chain ID, default 11155111 (Sepolia).

Backend routes expected (when not in mock):
- GET /profiles
- GET /me/cr
- POST /me/cr/link
- POST /wagers
- POST /wagers/deposit
- GET /wagers/:id/status
- GET /wagers/live
- GET /wagers/history
- GET /auth/nonce
- POST /auth/verify

Escrow client:
- Real mode requires ABI wiring and a provider/signer. Current implementation is a scaffold. Update `services/blockchain.js` with ABI and ethers.js integration for production.

Notes:
- SIWE-like flow is simulated in mock mode.
- UI shows banners when mock or dry-run are active.

To integrate with a real backend and contract, replace mock implementations in `services/api.js` and `services/blockchain.js` and ensure CORS + cookie/session is configured if needed.
