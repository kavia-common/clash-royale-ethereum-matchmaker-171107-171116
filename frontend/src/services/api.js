//
// Centralized API client for the frontend to talk to the backend.
// Uses fetch with JSON helpers, environment-based base URL, and typed endpoints.
//
// Required env vars (documented in .env.example):
// - REACT_APP_API_URL
//
// See INTEGRATION_NOTES.md for assumed API contracts and models.
// TODO: Align paths and shapes with the backend team.
//
// Design goals:
// - Provide a factory createApiClient(baseUrl?) for testability and flexibility.
// - Maintain backward-compatible named exports already used by components.
// - Consistent error handling via ApiError with {code, message, details?} shape.
// - JSDoc typedefs enable IDE intellisense and self-documentation.
//

const BASE_URL = process.env.REACT_APP_API_URL || "";

// Flag: mock mode when API URL is missing and not production
export const IS_API_MOCK_MODE = !BASE_URL && process.env.NODE_ENV !== 'production';

/**
 * PUBLIC_INTERFACE
 * ApiError
 * Error with typed fields that mirror backend error format.
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{status?: number, code?: string, details?: any, data?: any}} [opts]
   */
  constructor(message, { status, code, details, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? 0;
    this.code = code || "API_ERROR";
    this.details = details;
    this.data = data;
  }
}

/**
 * PUBLIC_INTERFACE
 * UserProfile model
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} username
 * @property {string=} rank
 * @property {string=} avatarUrl
 * @property {number} wagerEth
 */

/**
 * PUBLIC_INTERFACE
 * Wager model
 * @typedef {Object} Wager
 * @property {string} id
 * @property {"initiated"|"awaiting-deposits"|"ready"|"in-progress"|"completed"|"cancelled"} status
 * @property {{challenger: string, opponent: string}} players
 * @property {{challengerEth: number, opponentEth: number, totalEth?: number}} amounts
 * @property {string} createdAt
 * @property {string=} updatedAt
 */

/**
 * PUBLIC_INTERFACE
 * GameHistoryItem model
 * @typedef {Object} GameHistoryItem
 * @property {string} id
 * @property {string} date
 * @property {string} opponent
 * @property {number} wagerEth
 * @property {"win"|"loss"|"draw"|"cancelled"} result
 * @property {number=} profitEth
 */

/**
 * PUBLIC_INTERFACE
 * CRProfile model (subset)
 * @typedef {Object} CRProfile
 * @property {string} tag
 * @property {string} name
 * @property {number=} trophies
 * @property {number=} bestTrophies
 * @property {number=} expLevel
 * @property {number=} wins
 * @property {number=} losses
 * @property {{name?: string}=} clan
 */

/**
 * Request helper with consistent error handling.
 * Throws ApiError on non-2xx status codes or network failures.
 * @param {string} baseUrl
 * @param {string} path
 * @param {RequestInit & {parseText?: boolean}} [init]
 * @returns {Promise<any>}
 */
async function request(baseUrl, path, { method = "GET", headers = {}, body, signal, parseText = false } = {}) {
  const url = `${baseUrl}${path}`;
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    signal,
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const err = new ApiError(`Network error contacting API: ${e?.message || "unknown"}`, { code: "NETWORK_ERROR" });
    err.cause = e;
    throw err;
  }

  const text = await res.text();
  const maybeJson = text ? safeJson(text) : null;

  if (!res.ok) {
    // Prefer backend-provided message/code/details if present
    const code = (maybeJson && (maybeJson.code || maybeJson.error?.code)) || "API_ERROR";
    const message =
      (maybeJson && (maybeJson.message || maybeJson.error?.message)) ||
      `API error: ${res.status}`;
    const details = maybeJson && (maybeJson.details || maybeJson.error?.details);
    const err = new ApiError(message, { status: res.status, code, details, data: maybeJson });
    throw err;
  }

  if (parseText) return text;
  return maybeJson;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * PUBLIC_INTERFACE
 * createApiClient
 * Factory returning typed methods bound to a base URL.
 * @param {string=} baseUrl Default: process.env.REACT_APP_API_URL or ""
 */
export function createApiClient(baseUrl = BASE_URL) {
  // Attach Authorization header if an app-level accessor is provided in future.
  const authHeaders = () => {
    // TODO: wire in session token/cookie as needed. See INTEGRATION_NOTES.md.
    return {};
  };

  // Mock helpers
  function seededRand(seed) {
    let h = 2166136261 ^ seed;
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function mockProfile(i) {
    const r = seededRand(1000 + i);
    const ranks = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
    return {
      id: `mock-${i + 1}`,
      username: `Player_${i + 1}`,
      rank: ranks[i % ranks.length],
      avatarUrl: '',
      wagerEth: Number((0.05 + (r % 0.45)).toFixed(2)),
    };
  }
  function mockProfiles({ minWager, maxWager, cursor } = {}) {
    const start = Number(cursor || 0);
    const pageSize = 10;
    const items = Array.from({ length: pageSize }, (_, idx) => mockProfile(start + idx));
    const filtered = items.filter(p => {
      const okMin = minWager != null ? p.wagerEth >= Number(minWager) : true;
      const okMax = maxWager != null ? p.wagerEth <= Number(maxWager) : true;
      return okMin && okMax;
    });
    const nextCursor = start + pageSize < 60 ? String(start + pageSize) : null;
    return { items: filtered, nextCursor, hasMore: Boolean(nextCursor) };
  }
  function mockHistory() {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `hist-${i}`,
      date: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
      opponent: `0x${(i + 1).toString(16).padStart(40, 'a')}`,
      wagerEth: Number((0.05 + i * 0.02).toFixed(2)),
      result: i % 2 === 0 ? 'win' : 'loss',
      profitEth: i % 2 === 0 ? Number((0.05 + i * 0.02).toFixed(2)) : -Number((0.05 + i * 0.02).toFixed(2)),
    }));
  }

  // Auth/session
  // PUBLIC_INTERFACE
  async function getSessionMe() {
    /** Get current session user. GET /me */
    if (IS_API_MOCK_MODE) {
      return { id: 'dev-user', username: 'DevUser', address: `0x${'d'.repeat(40)}` };
    }
    return request(baseUrl, `/me`, { method: "GET", headers: authHeaders() });
  }
  // PUBLIC_INTERFACE
  async function getWalletNonce(address) {
    /** Request nonce for wallet signature. POST /auth/wallet-nonce */
    if (IS_API_MOCK_MODE) {
      return { nonce: `mock-nonce-${(address || '').slice(2, 6)}` };
    }
    return request(baseUrl, `/auth/wallet-nonce`, { method: "POST", body: { address } });
  }
  // PUBLIC_INTERFACE
  async function verifyWalletSignature({ address, signature }) {
    /** Verify wallet signature and establish a session. POST /auth/wallet-verify */
    if (IS_API_MOCK_MODE) {
      return { ok: true, address, signature, token: 'mock-session' };
    }
    return request(baseUrl, `/auth/wallet-verify`, { method: "POST", body: { address, signature } });
  }

  // Clash Royale linking
  // PUBLIC_INTERFACE
  async function crLink({ tag, token }) {
    /** Link CR account to session. POST /cr/link */
    if (IS_API_MOCK_MODE) {
      return { ok: true, tag, linkedAt: new Date().toISOString() };
    }
    return request(baseUrl, `/cr/link`, { method: "POST", headers: authHeaders(), body: { tag, token } });
  }
  // PUBLIC_INTERFACE
  async function crMe() {
    /** Fetch linked CR profile. GET /cr/me */
    if (IS_API_MOCK_MODE) {
      return { tag: '#2PP', name: 'Dev Barbarian', trophies: 4200, expLevel: 13 };
    }
    return request(baseUrl, `/cr/me`, { method: "GET", headers: authHeaders() });
  }

  // Clash Royale helper endpoints via backend proxy (optional)
  // PUBLIC_INTERFACE
  async function getCRPlayer({ tag, token } = {}) {
    /** Fetch CR player profile via backend proxy. */
    if (IS_API_MOCK_MODE) {
      return { tag: tag || '#2PP', name: 'Dev Barbarian', trophies: 4200, expLevel: 13 };
    }
    const params = new URLSearchParams();
    if (tag) params.set("tag", String(tag));
    const headers = { ...authHeaders() };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(baseUrl, `/cr/player${qs}`, { method: "GET", headers });
  }
  // PUBLIC_INTERFACE
  async function getCRFavoriteCards({ tag, token } = {}) {
    /** Fetch CR favorites/deck via backend proxy. */
    if (IS_API_MOCK_MODE) {
      return { favorites: ['Knight', 'Archers', 'Fireball'] };
    }
    const params = new URLSearchParams();
    if (tag) params.set("tag", String(tag));
    const headers = { ...authHeaders() };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(baseUrl, `/cr/player/favorites${qs}`, { method: "GET", headers });
  }

  // Profiles
  // PUBLIC_INTERFACE
  async function getProfiles({ minWager, maxWager, cursor } = {}) {
    /** List profiles with optional wager filter and pagination. GET /profiles */
    if (IS_API_MOCK_MODE) {
      return new Promise((resolve) => setTimeout(() => resolve(mockProfiles({ minWager, maxWager, cursor })), 120));
    }
    const params = new URLSearchParams();
    if (minWager != null) params.set("minWager", String(minWager));
    if (maxWager != null) params.set("maxWager", String(maxWager));
    if (cursor) params.set("cursor", String(cursor));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(baseUrl, `/profiles${qs}`, { method: "GET", headers: authHeaders() });
  }

  // Wagers: Live, History, Initiate, State changes
  // PUBLIC_INTERFACE
  async function getLiveWagers() {
    /** List current live/open wagers. GET /wagers/live */
    if (IS_API_MOCK_MODE) {
      return [
        { id: 'live-1', status: 'awaiting-deposits', players: { challenger: '0x'+'a'.repeat(40), opponent: '0x'+'b'.repeat(40)}, amounts: { challengerEth: 0.1, opponentEth: 0.1 } },
      ];
    }
    return request(baseUrl, `/wagers/live`, { method: "GET", headers: authHeaders() });
  }
  // PUBLIC_INTERFACE
  async function getWagerHistory() {
    /** List wager history for the authenticated user. GET /wagers/history */
    if (IS_API_MOCK_MODE) {
      return mockHistory();
    }
    return request(baseUrl, `/wagers/history`, { method: "GET", headers: authHeaders() });
  }
  // PUBLIC_INTERFACE
  async function initiateWager({ opponentId, wagerEth }) {
    /** Create a new wager intent. POST /wagers/initiate */
    if (IS_API_MOCK_MODE) {
      return new Promise((resolve) =>
        setTimeout(() => resolve({ id: `mock-wager-${Date.now()}`, opponentId, wagerEth, status: 'awaiting-deposits' }), 120)
      );
    }
    return request(baseUrl, `/wagers/initiate`, { method: "POST", headers: authHeaders(), body: { opponentId, wagerEth } });
  }
  // PUBLIC_INTERFACE
  async function depositNotify({ id, txHash, amountEth }) {
    /** Notify backend of a deposit tx hash. POST /wagers/:id/deposit */
    if (IS_API_MOCK_MODE) {
      return { ok: true, id, txHash, amountEth };
    }
    return request(baseUrl, `/wagers/${encodeURIComponent(id)}/deposit`, {
      method: "POST",
      headers: authHeaders(),
      body: { txHash, amountEth },
    });
  }
  // PUBLIC_INTERFACE
  async function confirmWager({ id }) {
    /** Confirm both deposits and mark as ready/in-progress. POST /wagers/:id/confirm */
    if (IS_API_MOCK_MODE) {
      return { ok: true, id, status: 'ready' };
    }
    return request(baseUrl, `/wagers/${encodeURIComponent(id)}/confirm`, { method: "POST", headers: authHeaders(), body: {} });
  }
  // PUBLIC_INTERFACE
  async function cancelWager({ id, reason }) {
    /** Cancel a wager before completion. POST /wagers/:id/cancel */
    if (IS_API_MOCK_MODE) {
      return { ok: true, id, status: 'cancelled', reason };
    }
    return request(baseUrl, `/wagers/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: authHeaders(), body: { reason } });
  }
  // PUBLIC_INTERFACE
  async function postWagerResult({ id, result, proof }) {
    /** Post final match result to settle escrow. POST /wagers/:id/result */
    if (IS_API_MOCK_MODE) {
      return { ok: true, id, result, settledAt: new Date().toISOString() };
    }
    return request(baseUrl, `/wagers/${encodeURIComponent(id)}/result`, {
      method: "POST",
      headers: authHeaders(),
      body: { result, proof },
    });
  }

  // Escrow helpers
  // PUBLIC_INTERFACE
  async function getEscrowConfig() {
    /** Read escrow config (address, chainId, limits). GET /escrow/config */
    if (IS_API_MOCK_MODE) {
      return { address: '0x' + 'e'.repeat(40), chainId: 11155111, min: 0.01, max: 1, abi: [] };
    }
    return request(baseUrl, `/escrow/config`, { method: "GET", headers: authHeaders() });
  }
  // PUBLIC_INTERFACE
  async function getEscrowStatus({ wagerId }) {
    /** Read escrow status for a wager. GET /escrow/:wagerId/status */
    if (IS_API_MOCK_MODE) {
      return { wagerId, status: 'deposited', state: 'ready' };
    }
    return request(baseUrl, `/escrow/${encodeURIComponent(wagerId)}/status`, { method: "GET", headers: authHeaders() });
  }

  return {
    // Auth/session
    getSessionMe,
    getWalletNonce,
    verifyWalletSignature,
    // Clash Royale
    crLink,
    crMe,
    getCRPlayer,
    getCRFavoriteCards,
    // Profiles
    getProfiles,
    // Wagers
    getLiveWagers,
    getWagerHistory,
    initiateWager,
    depositNotify,
    confirmWager,
    cancelWager,
    postWagerResult,
    // Escrow
    getEscrowConfig,
    getEscrowStatus,
  };
}

// Default client bound to env base URL
const defaultClient = createApiClient();

/**
 * Backward-compatible named exports
 * These preserve existing imports used by components while transitioning to the factory-based API.
 */

// PUBLIC_INTERFACE
export async function apiGetLiveWagers() {
  /** Fetch live wagers. Wrapper for getLiveWagers(). */
  return defaultClient.getLiveWagers();
}

// PUBLIC_INTERFACE
export async function apiGetGameHistory() {
  /**
   * Fetch user wager/game history.
   * Wrapper for getWagerHistory(). Earlier drafts used /games/history; aligning to /wagers/history.
   */
  return defaultClient.getWagerHistory();
}

// PUBLIC_INTERFACE
export async function apiGetProfiles({ minWager, maxWager, cursor } = {}) {
  /** Fetch list of profiles. Optional filter. Wrapper for getProfiles(). */
  return defaultClient.getProfiles({ minWager, maxWager, cursor });
}

// PUBLIC_INTERFACE
export async function apiLinkAccount({ tag, token, walletAddress } = {}) {
  /**
   * Link Clash Royale account. Wrapper for crLink().
   * Note: walletAddress parameter is currently unused by the assumed endpoint.
   */
  // eslint-disable-next-line no-unused-vars
  const _ = walletAddress; // kept for backward compatibility; remove after API stabilizes
  return defaultClient.crLink({ tag, token });
}

// PUBLIC_INTERFACE
export async function apiCreateMatch({ opponentId, wagerEth }) {
  /** Create a wager intent (match). Wrapper for initiateWager(). */
  return defaultClient.initiateWager({ opponentId, wagerEth });
}

// PUBLIC_INTERFACE
export async function apiConfirmDeposit({ matchId, txHash }) {
  /** Notify backend of a deposit tx. Wrapper for depositNotify(). */
  return defaultClient.depositNotify({ id: matchId, txHash });
}

// PUBLIC_INTERFACE
export async function apiGetMatchStatus({ matchId }) {
  /** Poll escrow status for a wager. Wrapper for getEscrowStatus(). */
  return defaultClient.getEscrowStatus({ wagerId: matchId });
}

// PUBLIC_INTERFACE
export async function apiGetCRPlayer({ tag, token } = {}) {
  /** Fetch CR player via backend proxy. */
  return defaultClient.getCRPlayer({ tag, token });
}

/** PUBLIC_INTERFACE
 * apiGetCRMe
 * Fetch the linked CR profile for the current session. Wrapper for crMe().
 */
export async function apiGetCRMe() {
  return defaultClient.crMe();
}

// PUBLIC_INTERFACE
export async function apiGetCRFavoriteCards({ tag, token } = {}) {
  /** Fetch CR favorites via backend proxy. */
  return defaultClient.getCRFavoriteCards({ tag, token });
}

// PUBLIC_INTERFACE
export default defaultClient;
