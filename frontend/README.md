# Clash Royale Ethereum Matchmaker - Frontend

This is the React frontend for browsing player profiles, linking Clash Royale accounts, filtering by wager, and running the escrow flow for ETH wagers.

## Development Modes

- Mock API mode: If `REACT_APP_API_URL` is not set in `.env`, the frontend returns deterministic mock data for profiles, wagers, and history. Components will show a small banner indicating "Mock API mode".
- Dry-run escrow: If `REACT_APP_DRY_RUN_ESCROW=true`, the blockchain service simulates a deposit with a synthetic tx hash and a short confirmation delay. The Escrow modal shows a banner indicating "Dry-run mode". No on-chain transactions are sent.

## Environment Variables

Create a `.env` file in the `frontend` directory. See `.env.example` for an example. Key variables:

- `REACT_APP_API_URL` (optional in dev): Backend API base URL. If omitted, mock data is used and a banner is shown.
- `REACT_APP_ESCROW_ADDRESS`: Escrow contract address on the configured chain.
- `REACT_APP_CHAIN_ID`: Numeric chain ID (e.g., 11155111 for Sepolia).
- `REACT_APP_BLOCK_EXPLORER_BASE`: Block explorer base URL (e.g., https://sepolia.etherscan.io).
- `REACT_APP_DRY_RUN_ESCROW`: Set to `true` to simulate escrow deposits without on-chain tx.

Notes:
- All variables must be prefixed with `REACT_APP_` to be accessible by the React app.
- In development, the app will log helpful warnings if variables are missing or inconsistent.
- Do not commit your `.env` file to version control.

## Where logic lives

- API calls are centralized in `src/services/api.js`. This file includes mock fallbacks when no `REACT_APP_API_URL` is set.
- Blockchain interactions are in `src/services/blockchain.js`. This file includes a dry-run mode when `REACT_APP_DRY_RUN_ESCROW=true`.
- `ProfileList.jsx` shows a banner when mock mode is active.
- `EscrowModal.jsx` shows a banner when dry-run is active.

## Available Scripts

In the project directory, you can run:

### npm start

Runs the app in development mode.
Open http://localhost:3000 to view it in your browser.

### npm test

Launches the test runner in watch mode.

### npm run build

Builds the app for production to the `build` folder.

## Notes

- The escrow contract ABI and method names are placeholders; align with the on-chain contract as it stabilizes.
- The mock API shapes are designed to enable UI development and tests; adjust as backend endpoints finalize.
