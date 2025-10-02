# Frontend Integration Notes

This frontend is wired to connect to a backend and an Ethereum escrow contract.

Backend endpoints (assumptions; adjust to your API):
- GET /profiles -> [{ id, username, rank, avatarUrl?, wagerEth }]
- POST /link-account -> { success: true }
  Body: { tag?: string, token?: string, walletAddress?: string }
- POST /matches -> { matchId, ... }
  Body: { opponentId, wagerEth }
- POST /matches/:matchId/deposit -> { ok: true }
  Body: { txHash }
- GET /matches/:matchId -> { status: 'awaiting-opponent' | 'ready' | 'completed' }

Environment variables:
- REACT_APP_API_URL: Base URL for backend (e.g., http://localhost:8000)
- REACT_APP_ESCROW_ADDRESS: Escrow contract address on current chain.

Files to review:
- src/services/api.js: Centralized fetch client and API methods.
- src/services/blockchain.js: Ethers-based escrow deposit helper.
- src/components/ProfileList.jsx: Loads profiles via API, handles match creation and deposit flow.
- src/components/LinkAccountModal.jsx: Calls apiLinkAccount via App.js handler.
- src/components/EscrowModal.jsx: UI flow states and safety checks for wallet connection.

Error handling:
- Network/API errors bubble up and display minimal messages in UI where appropriate.
- If deposit succeeds but backend confirm fails, we log a warning and keep UI success state, assuming subsequent status polling or refresh will reconcile.

Stubs and TODOs:
- Escrow ABI is a minimal placeholder with deposit(uint256 matchId) payable.
  Replace with the actual ABI and method signature as needed.
- Profile data shape and API paths may require updates to match your backend.
