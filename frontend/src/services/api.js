//
// services/api.js
//
// PUBLIC_INTERFACE
// Provides API client with mock-friendly behavior. If REACT_APP_API_URL is unset,
// returns mock handlers that simulate backend interactions (profiles, wagers,
// auth.nonce/verify, history, deposits, Clash Royale link lifecycle).
//

/** Utility: wait for ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Deterministic pseudo-random generator for stable mock outputs */
function mulberry32(seed) {
  let t = seed + 0x6d2b79f5;
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const API_URL = process.env.REACT_APP_API_URL;

const mockProfiles = [
  {
    id: "p1",
    crTag: "#ABC123",
    name: "BlueKnight",
    trophy: 6200,
    preferredWagerEth: 0.01,
    availability: "Evenings",
  },
  {
    id: "p2",
    crTag: "#ZZTOP",
    name: "AmberQueen",
    trophy: 5400,
    preferredWagerEth: 0.02,
    availability: "Weekends",
  },
  {
    id: "p3",
    crTag: "#ROYALE",
    name: "ShadowPrince",
    trophy: 6800,
    preferredWagerEth: 0.05,
    availability: "Flexible",
  },
];

let mockSession = {
  address: null,
  siwe: null,
  nonce: null,
};

let mockWagers = [
  {
    id: "w1",
    opponent: mockProfiles[0],
    amountEth: 0.01,
    status: "open",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: "w2",
    opponent: mockProfiles[1],
    amountEth: 0.02,
    status: "matched",
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
  },
];

let mockHistory = [
  {
    id: "h1",
    opponent: "AmberQueen",
    result: "win",
    amountEth: 0.01,
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    id: "h2",
    opponent: "BlueKnight",
    result: "loss",
    amountEth: 0.02,
    timestamp: Date.now() - 1000 * 60 * 60 * 10,
  },
];

/** In-memory map for mock Clash Royale link state, scoped by wallet address */
const mockCRByAddress = new Map();

/** Normalize a Clash Royale tag: uppercase, trim, strip spaces, ensure leading # */
function normalizeCRTag(input) {
  if (!input) return null;
  const s = String(input).toUpperCase().replace(/\s+/g, "").replace(/^#/, "");
  if (!/^[A-Z0-9]{3,14}$/.test(s)) return null;
  return `#${s}`;
}

/**
 * PUBLIC_INTERFACE
 * api - returns an API client. If API_URL not provided, returns a mocked client.
 */
function api(fetchImpl = fetch) {
  if (!API_URL) {
    const rng = mulberry32(42);
    return {
      // PUBLIC_INTERFACE
      async getProfiles() {
        await delay(150);
        return mockProfiles.map((p, i) => ({
          ...p,
          online: rng() > 0.3,
          recentActivityMins: Math.floor(rng() * 120),
          idx: i,
        }));
      },

      // PUBLIC_INTERFACE
      async getCRMe() {
        await delay(120);
        const addr = mockSession.address || "0xMockAddress";
        const state = mockCRByAddress.get(addr);
        if (!state || !state.linked) {
          return { linked: false, crTag: null, name: null, trophies: null };
        }
        return { linked: true, crTag: state.crTag, name: state.name, trophies: state.trophies ?? 5200 };
      },

      // PUBLIC_INTERFACE
      async crLink({ tag, token, crTag }) {
        await delay(200);
        const addr = mockSession.address || "0xMockAddress";
        const normalized = normalizeCRTag(tag || crTag || "#MOCK123");
        if (!normalized) {
          const err = new Error("Invalid player tag.");
          err.code = "INVALID_TAG";
          throw err;
        }
        mockCRByAddress.set(addr, {
          linked: true,
          crTag: normalized,
          name: "LinkedUser",
          trophies: 5300,
          linkedAt: Date.now(),
        });
        return { linked: true, crTag: normalized, name: "LinkedUser", trophies: 5300 };
      },

      // PUBLIC_INTERFACE
      async crUnlink() {
        await delay(120);
        const addr = mockSession.address || "0xMockAddress";
        mockCRByAddress.set(addr, { linked: false });
        return { ok: true, linked: false };
      },

      // PUBLIC_INTERFACE
      async getCRPlayer({ tag }) {
        await delay(150);
        const normalized = normalizeCRTag(tag) || "#MOCK123";
        return {
          tag: normalized,
          name: "MockUser",
          trophies: 5400,
          bestTrophies: 6200,
          expLevel: 13,
          wins: 1234,
          losses: 1111,
          clan: { name: "Mock Clan" },
          role: "member",
        };
      },

      // PUBLIC_INTERFACE
      async getCRFavoriteCards({ tag }) {
        await delay(100);
        const normalized = normalizeCRTag(tag) || "#MOCK123";
        const base = normalized.slice(-4);
        return Array.from({ length: 8 }).map((_, i) => ({
          id: `${base}-${i}`,
          name: `Card ${i + 1}`,
        }));
      },

      // PUBLIC_INTERFACE
      async initWager({ opponentId, amountEth }) {
        await delay(200);
        const newWager = {
          id: "w" + (mockWagers.length + 1),
          opponent: mockProfiles.find((p) => p.id === opponentId) || mockProfiles[0],
          amountEth,
          status: "open",
          createdAt: Date.now(),
        };
        mockWagers.unshift(newWager);
        return newWager;
      },

      // PUBLIC_INTERFACE
      async notifyDeposit({ wagerId, txHash }) {
        await delay(150);
        mockWagers = mockWagers.map((w) =>
          w.id === wagerId ? { ...w, status: "deposit_pending", txHash } : w
        );
        return { ok: true };
      },

      // PUBLIC_INTERFACE
      async getWagerStatus({ wagerId }) {
        await delay(120);
        const w = mockWagers.find((x) => x.id === wagerId);
        if (!w) return { status: "unknown" };
        const states = ["open", "deposit_pending", "ready", "in_game", "settled"];
        const idx = Math.floor((Date.now() / 5000) % states.length);
        return { status: w.status === "settled" ? "settled" : states[idx], wager: w };
      },

      // PUBLIC_INTERFACE
      async getLive() {
        await delay(100);
        return mockWagers.filter((w) => w.status !== "settled");
      },

      // PUBLIC_INTERFACE
      async getHistory() {
        await delay(100);
        return mockHistory;
      },

      // PUBLIC_INTERFACE
      auth: {
        // PUBLIC_INTERFACE
        async nonce() {
          await delay(80);
          const nonce = Math.floor(Math.random() * 1e6).toString();
          mockSession.nonce = nonce;
          return { nonce };
        },
        // PUBLIC_INTERFACE
        async verify({ message, signature, address }) {
          await delay(80);
          mockSession.address = address || "0xMockAddress";
          mockSession.siwe = { message, signature, address: mockSession.address };
          return { ok: true, address: mockSession.address };
        },
      },
    };
  }

  // Real client scaffolding
  const base = API_URL.replace(/\/*$/, "");

  async function req(path, opts) {
    const res = await fetchImpl(`${base}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
      ...opts,
    });
    if (!res.ok) {
      let message = `API error ${res.status}`;
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {}
      throw new Error(message);
    }
    return res.json();
  }

  return {
    // PUBLIC_INTERFACE
    getProfiles() {
      return req("/profiles", { method: "GET" });
    },
    // PUBLIC_INTERFACE
    getCRMe() {
      return req("/me/cr", { method: "GET" });
    },
    // PUBLIC_INTERFACE
    crLink(body) {
      return req("/me/cr/link", { method: "POST", body: JSON.stringify(body) });
    },
    // PUBLIC_INTERFACE
    crUnlink() {
      return req("/me/cr/link", { method: "DELETE" });
    },
    // PUBLIC_INTERFACE
    getCRPlayer({ tag, token }) {
      const q = new URLSearchParams({ tag, token: token || "" }).toString();
      return req(`/cr/player?${q}`, { method: "GET" });
    },
    // PUBLIC_INTERFACE
    getCRFavoriteCards({ tag, token }) {
      const q = new URLSearchParams({ tag, token: token || "" }).toString();
      return req(`/cr/favorites?${q}`, { method: "GET" });
    },
    // PUBLIC_INTERFACE
    initWager(body) {
      return req("/wagers", { method: "POST", body: JSON.stringify(body) });
    },
    // PUBLIC_INTERFACE
    notifyDeposit(body) {
      return req("/wagers/deposit", { method: "POST", body: JSON.stringify(body) });
    },
    // PUBLIC_INTERFACE
    getWagerStatus({ wagerId }) {
      return req(`/wagers/${encodeURIComponent(wagerId)}/status`, { method: "GET" });
    },
    // PUBLIC_INTERFACE
    getLive() {
      return req("/wagers/live", { method: "GET" });
    },
    // PUBLIC_INTERFACE
    getHistory() {
      return req("/wagers/history", { method: "GET" });
    },
    auth: {
      // PUBLIC_INTERFACE
      nonce() {
        return req("/auth/nonce", { method: "GET" });
      },
      // PUBLIC_INTERFACE
      verify(body) {
        return req("/auth/verify", { method: "POST", body: JSON.stringify(body) });
      },
    },
  };
}

// Top-level exports
export { api };

// Convenience named helpers for components/tests
export const apiGetCRMe = (fetchImpl) => api(fetchImpl).getCRMe();
export const apiGetProfiles = (fetchImpl) => api(fetchImpl).getProfiles();
export const apiInitWager = (body, fetchImpl) => api(fetchImpl).initWager(body);
export const apiNotifyDeposit = (body, fetchImpl) => api(fetchImpl).notifyDeposit(body);
export const apiGetWagerStatus = (args, fetchImpl) => api(fetchImpl).getWagerStatus(args);
export const apiGetLive = (fetchImpl) => api(fetchImpl).getLive();
export const apiGetLiveWagers = (fetchImpl) => api(fetchImpl).getLive();
export const apiGetHistory = (fetchImpl) => api(fetchImpl).getHistory();
export const apiGetGameHistory = (fetchImpl) => api(fetchImpl).getHistory();
export const apiGetCRPlayer = (args, fetchImpl) => api(fetchImpl).getCRPlayer(args);
export const apiGetCRFavoriteCards = (args, fetchImpl) => api(fetchImpl).getCRFavoriteCards(args);
export const apiCRLink = (args, fetchImpl) => api(fetchImpl).crLink(args);
export const apiCRUnlink = (fetchImpl) => api(fetchImpl).crUnlink();

// Default export shim
const apiClient = (fetchImpl) => api(fetchImpl);
export default apiClient;
