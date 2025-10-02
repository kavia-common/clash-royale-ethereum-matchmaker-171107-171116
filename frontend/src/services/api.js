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
