# Clash Royale Ethereum Matchmaker - Frontend

Interactive React frontend with mock API and dry-run escrow for preview on port 3000.

## Quick start

- Install deps: `npm install`
- Start dev server: `npm start`
- Open: http://localhost:3000

By default:
- Mock API is used (no backend required).
- Escrow deposits are simulated (no funds needed).

## Environment

Create `.env` in the `frontend` folder to enable real integrations:

```
REACT_APP_API_URL=https://your-backend.example.com
REACT_APP_DRY_RUN_ESCROW=false
REACT_APP_ESCROW_ADDRESS=0xYourEscrowAddress
REACT_APP_CHAIN_ID=11155111
```

Omit `REACT_APP_API_URL` to use mock API. Set `REACT_APP_DRY_RUN_ESCROW=true` or omit `REACT_APP_ESCROW_ADDRESS` to simulate deposits.

See INTEGRATION_NOTES.md for backend routes and escrow notes.

## Features

- Wallet connect/disconnect with mock SIWE.
- Profiles list with wager filtering.
- Escrow modal with dry-run simulation.
- Deposits dashboard and game history.
- Ocean Professional theme and accessible UI primitives.

## Development

- Components and services are documented with PUBLIC_INTERFACE markers.
- Tests should pass in CI with mock mode.
