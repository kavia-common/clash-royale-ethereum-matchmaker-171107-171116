#!/usr/bin/env node
/**
 * Optional Express-based mock API server for local integration testing.
 * This server emulates planned backend endpoints and maintains in-memory state,
 * supporting multi-user interactions beyond the built-in frontend mock layer.
 *
 * Start with: npm run mock:api
 * Default URL: http://localhost:4000
 *
 * Environment:
 * - PORT (optional): override port (default 4000)
 *
 * Endpoints:
 *  - POST   /auth/nonce
 *  - POST   /auth/verify
 *  - GET    /profiles
 *  - GET    /cr/me
 *  - POST   /cr/link
 *  - DELETE /cr/link
 *  - POST   /wagers/initiate
 *  - POST   /wagers/:id/deposit-notify
 *  - POST   /wagers/:id/confirm
 *  - GET    /wagers/live
 *  - GET    /wagers/history
 *  - GET    /wagers/:id/status
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Utility: simulated latency
function delay(ms = 250) {
  return new Promise((res) => setTimeout(res, ms));
}

// Utility: deterministic IDs and nonces
const seed = 'mock-api-seed';
function deterministicId(prefix, input) {
  const hash = crypto.createHash('sha256').update(seed + ':' + String(input)).digest('hex').slice(0, 12);
  return `${prefix}_${hash}`;
}
function newNonce() {
  const ts = Date.now().toString(36);
  return `nonce_${ts}_${crypto.randomBytes(4).toString('hex')}`;
}

// In-memory stores
const state = {
  users: new Map(), // walletAddress -> { walletAddress, createdAt }
  sessions: new Map(), // sessionToken -> { walletAddress, createdAt }
  nonces: new Map(), // walletAddress -> { nonce, createdAt }
  profiles: [], // seeded below
  wagers: new Map(), // wagerId -> wager object
};

// Seed mock profiles
function seedProfiles() {
  const seeds = [
    { username: 'KingArthur', tier: 'Gold', wagerEth: 0.05, winRate: 0.62 },
    { username: 'MageMira', tier: 'Silver', wagerEth: 0.02, winRate: 0.55 },
    { username: 'GolemGuy', tier: 'Platinum', wagerEth: 0.1, winRate: 0.7 },
    { username: 'HogRider77', tier: 'Bronze', wagerEth: 0.01, winRate: 0.49 },
    { username: 'PEKKAPunch', tier: 'Diamond', wagerEth: 0.2, winRate: 0.74 },
  ];
  state.profiles = seeds.map((p, idx) => ({
    id: deterministicId('profile', idx),
    username: p.username,
    tier: p.tier,
    wagerEth: p.wagerEth,
    winRate: p.winRate,
    online: true,
  }));
}
seedProfiles();

// Simple auth helpers
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !state.sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.session = state.sessions.get(token);
  return next();
}

// Shape helpers for consistency
function sessionPayload(sessionToken, walletAddress) {
  return {
    sessionToken,
    walletAddress,
  };
}

function profileMePayload(walletAddress) {
  // For demo, "me" could be reflected as a lightweight profile
  return {
    walletAddress,
    linked: !!walletAddress,
    username: `user_${walletAddress.slice(2, 8)}`,
    tier: 'Unranked',
  };
}

function normalizeAmountEth(val) {
  const n = Number(val);
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 1e6) / 1e6;
}

// Routes

// POST /auth/nonce -> { walletAddress } => { nonce }
app.post('/auth/nonce', async (req, res) => {
  await delay();
  const { walletAddress } = req.body || {};
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress is required' });
  }
  const lower = walletAddress.toLowerCase();
  const nonce = newNonce();
  state.nonces.set(lower, { nonce, createdAt: Date.now() });
  return res.json({ nonce });
});

// POST /auth/verify -> { walletAddress, signature } => { sessionToken, walletAddress }
app.post('/auth/verify', async (req, res) => {
  await delay();
  const { walletAddress, signature } = req.body || {};
  if (!walletAddress || !signature) {
    return res.status(400).json({ error: 'walletAddress and signature are required' });
  }
  const lower = walletAddress.toLowerCase();
  const nonceObj = state.nonces.get(lower);
  if (!nonceObj) {
    return res.status(400).json({ error: 'No nonce requested for wallet' });
  }
  // Mock verification: accept any signature that includes the nonce substring
  if (!String(signature).includes(nonceObj.nonce)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // Create user if not exists
  if (!state.users.has(lower)) {
    state.users.set(lower, { walletAddress: lower, createdAt: Date.now() });
  }
  const sessionToken = deterministicId('sess', lower + ':' + nonceObj.nonce);
  state.sessions.set(sessionToken, { walletAddress: lower, createdAt: Date.now() });
  // Clear nonce to prevent replay (optional)
  state.nonces.delete(lower);
  return res.json(sessionPayload(sessionToken, lower));
});

// GET /profiles -> list of opponent profiles
app.get('/profiles', async (req, res) => {
  await delay();
  return res.json({ profiles: state.profiles });
});

// GET /cr/me -> requires auth, returns minimal linked account view
app.get('/cr/me', requireAuth, async (req, res) => {
  await delay();
  const { walletAddress } = req.session;
  return res.json(profileMePayload(walletAddress));
});

// POST /cr/link -> requires auth, { playerTag } -> { linked: true, playerTag }
app.post('/cr/link', requireAuth, async (req, res) => {
  await delay();
  const { playerTag } = req.body || {};
  if (!playerTag || typeof playerTag !== 'string') {
    return res.status(400).json({ error: 'playerTag is required' });
  }
  const { walletAddress } = req.session;
  // For demo, store link on user record
  const user = state.users.get(walletAddress);
  user.crLink = { playerTag, linkedAt: Date.now() };
  return res.json({ linked: true, playerTag });
});

// DELETE /cr/link -> requires auth -> { linked: false }
app.delete('/cr/link', requireAuth, async (req, res) => {
  await delay();
  const { walletAddress } = req.session;
  const user = state.users.get(walletAddress);
  if (user) delete user.crLink;
  return res.json({ linked: false });
});

// Wager model:
// {
//   id, createdAt, updatedAt,
//   challenger: walletAddress,
//   opponentProfileId,
//   amountEth,
//   deposits: { [walletAddress]: boolean },
//   confirmed: boolean,
//   status: 'initiated' | 'live' | 'completed'
// }

// POST /wagers/initiate -> requires auth
// body: { opponentProfileId, amountEth } -> { wager }
app.post('/wagers/initiate', requireAuth, async (req, res) => {
  await delay(400);
  const { opponentProfileId, amountEth } = req.body || {};
  const amt = normalizeAmountEth(amountEth);
  if (!opponentProfileId || amt === null) {
    return res.status(400).json({ error: 'opponentProfileId and valid amountEth are required' });
  }
  const opp = state.profiles.find((p) => p.id === opponentProfileId);
  if (!opp) {
    return res.status(404).json({ error: 'Opponent profile not found' });
  }
  const { walletAddress } = req.session;
  const id = deterministicId('wager', walletAddress + ':' + opponentProfileId + ':' + amt);
  const now = Date.now();
  const wager = {
    id,
    createdAt: now,
    updatedAt: now,
    challenger: walletAddress,
    opponentProfileId,
    amountEth: amt,
    deposits: { [walletAddress]: false, opponent: false },
    confirmed: false,
    status: 'initiated',
  };
  state.wagers.set(id, wager);
  return res.json({ wager });
});

// POST /wagers/:id/deposit-notify -> requires auth, body: { deposited: true }
app.post('/wagers/:id/deposit-notify', requireAuth, async (req, res) => {
  await delay(300);
  const { id } = req.params;
  const { deposited } = req.body || {};
  const w = state.wagers.get(id);
  if (!w) return res.status(404).json({ error: 'Wager not found' });
  const { walletAddress } = req.session;
  if (typeof deposited !== 'boolean') {
    return res.status(400).json({ error: 'deposited boolean is required' });
  }
  w.deposits[walletAddress] = deposited;
  // simulate opponent auto-deposit after challenger deposits to progress flows
  if (deposited) {
    w.deposits.opponent = true;
  }
  w.updatedAt = Date.now();
  // When both deposit, move to 'live'
  if (w.deposits[walletAddress] && w.deposits.opponent) {
    w.status = 'live';
  }
  return res.json({ wager: w });
});

// POST /wagers/:id/confirm -> requires auth -> mark confirmed and completed
app.post('/wagers/:id/confirm', requireAuth, async (req, res) => {
  await delay(300);
  const { id } = req.params;
  const w = state.wagers.get(id);
  if (!w) return res.status(404).json({ error: 'Wager not found' });
  // Require live status to confirm
  if (w.status !== 'live') {
    return res.status(400).json({ error: 'Wager is not live' });
  }
  w.confirmed = true;
  w.status = 'completed';
  w.updatedAt = Date.now();
  return res.json({ wager: w });
});

// GET /wagers/live -> requires auth
app.get('/wagers/live', requireAuth, async (req, res) => {
  await delay(200);
  const { walletAddress } = req.session;
  const list = Array.from(state.wagers.values()).filter(
    (w) => w.status === 'live' && w.challenger === walletAddress
  );
  return res.json({ wagers: list });
});

// GET /wagers/history -> requires auth
app.get('/wagers/history', requireAuth, async (req, res) => {
  await delay(200);
  const { walletAddress } = req.session;
  const list = Array.from(state.wagers.values()).filter(
    (w) => w.challenger === walletAddress && (w.status === 'completed' || w.status === 'live' || w.status === 'initiated')
  );
  return res.json({ wagers: list });
});

// GET /wagers/:id/status -> requires auth
app.get('/wagers/:id/status', requireAuth, async (req, res) => {
  await delay(150);
  const { id } = req.params;
  const w = state.wagers.get(id);
  if (!w) return res.status(404).json({ error: 'Wager not found' });
  return res.json({ status: w.status, wager: w });
});

// Root/help
app.get('/', (req, res) => {
  res.json({
    name: 'Mock API Server',
    version: '1.0.0',
    description: 'Optional Express-based mock backend for local integration testing.',
    endpoints: [
      'POST /auth/nonce',
      'POST /auth/verify',
      'GET /profiles',
      'GET /cr/me',
      'POST /cr/link',
      'DELETE /cr/link',
      'POST /wagers/initiate',
      'POST /wagers/:id/deposit-notify',
      'POST /wagers/:id/confirm',
      'GET /wagers/live',
      'GET /wagers/history',
      'GET /wagers/:id/status',
    ],
  });
});

// Start server
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock API server listening on http://localhost:${PORT}`);
});
