//
// Centralized API client for the frontend to talk to the backend.
// Uses fetch with JSON helpers, environment-based base URL, and typed endpoints.
//
// Required env vars (documented in .env.example):
// - REACT_APP_API_URL
//
// Endpoints are assumed based on common patterns; adjust paths to match your backend.
//
const BASE_URL = process.env.REACT_APP_API_URL || '';

/**
 * Ensure we never send Supercell credentials from the browser.
 * All sensitive operations should be performed by the backend.
 */

async function request(path, { method = 'GET', headers = {}, body, signal } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal,
  };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const err = new Error(`Network error contacting API: ${e.message}`);
    err.cause = e;
    throw err;
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `API error: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// PUBLIC_INTERFACE
export async function apiGetProfiles({ minWager, maxWager } = {}) {
  /** Fetch list of profiles. Optional query params for wager range. */
  const params = new URLSearchParams();
  if (minWager != null) params.set('minWager', String(minWager));
  if (maxWager != null) params.set('maxWager', String(maxWager));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/profiles${qs}`, { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function apiLinkAccount({ tag, token, walletAddress } = {}) {
  /** Link Clash Royale account or token to the current user/wallet. */
  return request(`/link-account`, {
    method: 'POST',
    body: { tag, token, walletAddress },
  });
}

// PUBLIC_INTERFACE
export async function apiCreateMatch({ opponentId, wagerEth }) {
  /** Create a match intent for escrow workflow. Returns a matchId or intentId. */
  return request(`/matches`, {
    method: 'POST',
    body: { opponentId, wagerEth },
  });
}

// PUBLIC_INTERFACE
export async function apiConfirmDeposit({ matchId, txHash }) {
  /** Notify backend that the escrow deposit tx is submitted/confirmed for this player. */
  return request(`/matches/${encodeURIComponent(matchId)}/deposit`, {
    method: 'POST',
    body: { txHash },
  });
}

// PUBLIC_INTERFACE
export async function apiGetMatchStatus({ matchId }) {
  /** Poll match status (e.g., to check if both deposits are confirmed). */
  return request(`/matches/${encodeURIComponent(matchId)}`, { method: 'GET' });
}

/**
 * Clash Royale integrations (read-only via backend proxy)
 * Your backend should implement these endpoints using the official Supercell Clash Royale API:
 * - GET /cr/player?tag=#TAG
 * - GET /cr/player/favorites?tag=#TAG
 * Both require the backend to authorize the Supercell API and handle rate limits per ToS.
 */

// PUBLIC_INTERFACE
export async function apiGetCRPlayer({ tag, token } = {}) {
  /** Fetch Clash Royale player profile by tag through backend proxy. */
  const params = new URLSearchParams();
  if (tag) params.set('tag', String(tag));
  // Optional: if your backend uses a frontend-provided session token (not Supercell token) include it as header
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/cr/player${qs}`, { method: 'GET', headers });
}

// PUBLIC_INTERFACE
export async function apiGetCRFavoriteCards({ tag, token } = {}) {
  /** Fetch a list of favorite cards/deck summary for the player via backend. */
  const params = new URLSearchParams();
  if (tag) params.set('tag', String(tag));
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/cr/player/favorites${qs}`, { method: 'GET', headers });
}
