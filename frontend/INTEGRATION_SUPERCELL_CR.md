# Clash Royale Integration (Frontend) — Read-only and Compliant

Scope
- Read-only display of a user’s Clash Royale profile and basic stats in the browser.
- No gameplay actions, deck manipulation, or ToS violations.
- All data is fetched via your backend which must call the official Supercell Clash Royale API.

Frontend Components
- LinkAccountModal: lets a user link by player tag or by a backend-accepted token. The frontend never sends Supercell developer keys.
- ClashRoyaleDashboard: modal/dashboard rendering of:
  - Player profile (name, tag, trophies, best trophies, level, wins/losses)
  - Clan summary (if any)
  - Favorite cards snapshot (from your backend; e.g., top used cards or favorites)

API Expectations (backend)
- GET /cr/player?tag=#TAG
  - Returns player JSON from Supercell API (partial fields are fine: name, trophies, bestTrophies, expLevel, wins, losses, role, clan{name}).
- GET /cr/player/favorites?tag=#TAG
  - Returns a small array of favorite/most-used cards or a simplified deck list.
- Authentication
  - If you use a user-scoped session token or JWT, accept it via Authorization: Bearer <token>.
  - Never expose Supercell developer keys in frontend; keep them server-side.

Environment
- REACT_APP_API_URL: Backend base URL (e.g., http://localhost:8000)
- REACT_APP_ESCROW_ADDRESS: Escrow contract address for Ethereum flows (unrelated to CR but required by the app).

Compliance
- Only render read-only stats and player/clan info.
- Do not automate gameplay or manipulate decks via API.
- Respect Supercell’s API rate limits and ToS in your backend.
