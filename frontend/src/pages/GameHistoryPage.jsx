import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameHistoryDashboard from '../components/GameHistoryDashboard';
import { apiGetLiveWagers, apiGetGameHistory } from '../services/api';

// PUBLIC_INTERFACE
export default function GameHistoryPage({ prefetching, initialLive, initialHistory }) {
  /**
   * GameHistoryPage: Full-page view for game history.
   * Top row: Live Stream (left) + Place Bet panel (right) with a close (×) top-right.
   * Below: Win/Loss/Profit stats and past games table (reusing GameHistoryDashboard inline).
   */
  const navigate = useNavigate();

  // Local state seeded by prefetched values for instantaneous render
  const [liveData, setLiveData] = useState(() => initialLive || null);
  const [historyData, setHistoryData] = useState(() => initialHistory || null);
  const [loading, setLoading] = useState(() => !!prefetching && !(initialLive && initialHistory));
  const [error, setError] = useState('');

  // If prefetched data arrives via props updates, sync into local state
  useEffect(() => {
    if (initialLive) setLiveData(initialLive);
    if (initialHistory) setHistoryData(initialHistory);
  }, [initialLive, initialHistory]);

  // On mount, if we didn't get prefetched results, proactively fetch
  useEffect(() => {
    let canceled = false;
    async function run() {
      if (liveData && historyData) return;
      setLoading(true);
      setError('');
      try {
        const [live, hist] = await Promise.allSettled([
          liveData ? Promise.resolve(liveData) : apiGetLiveWagers(),
          historyData ? Promise.resolve(historyData) : apiGetGameHistory(),
        ]);
        if (canceled) return;
        if (!liveData && live.status === 'fulfilled') setLiveData(live.value);
        if (!historyData && hist.status === 'fulfilled') setHistoryData(hist.value);
        if ((live.status === 'rejected') || (hist.status === 'rejected')) {
          setError('Some data failed to load. Showing what is available.');
        }
      } catch (e) {
        if (!canceled) setError(e?.message || 'Failed to load data.');
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    run();
    return () => { canceled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Provide a fetcher that returns the latest historyData or fetches fresh
  const historyFetcher = async () => {
    if (historyData) return historyData;
    const res = await apiGetGameHistory();
    setHistoryData(res);
    return res;
  };

  return (
    <div style={styles.pageWrap}>
      <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Game History</h1>
          <p style={styles.subtitle}>
            Track live wagers and review your past matches, win/loss, and profit.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close game history"
          onClick={() => navigate(-1)}
          style={styles.closeButton}
          title="Close and return"
        >
          ×
        </button>
      </header>

      {/* Live Game placeholder above the live feed */}
      <section style={styles.section}>
        <div style={{ ...styles.card, ...styles.liveGamePlaceholder }}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Live Game</h2>
            <span style={styles.badge}>Placeholder</span>
          </div>
          <div style={styles.liveGameBody}>
            <div style={styles.liveGameScreen} aria-label="Live game video placeholder">
              <div style={styles.liveGameLabel}>Stream window</div>
            </div>
            <div style={styles.liveGameMeta}>
              <div style={styles.liveGameRow}>
                <span style={styles.metaLabel}>Match</span>
                <span style={styles.metaValue}>BlueWhale vs AquaKnight</span>
              </div>
              <div style={styles.liveGameRow}>
                <span style={styles.metaLabel}>Series</span>
                <span style={styles.metaValue}>Best of 3</span>
              </div>
              <div style={styles.liveGameRow}>
                <span style={styles.metaLabel}>Wager</span>
                <span style={styles.metaValueStrong}>0.50 ETH</span>
              </div>
              <div style={styles.liveGameNote}>
                This is a visual placeholder. Replace with the actual live game stream when integrated.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top row: Live Stream (left) + Place Bet (right) */}
      <section style={styles.section}>
        <div style={styles.topRow}>
          <LiveFeedPanel />
          <PlaceBetPanel />
        </div>
      </section>

      {loading && (
        <div style={{ ...styles.section, paddingTop: 8 }}>
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div aria-label="Loading" role="status" style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '3px solid #BFDBFE', borderTopColor: '#2563EB',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ color: '#1E3A8A', fontWeight: 700, fontSize: 13 }}>
              Loading latest game data…
            </span>
          </div>
        </div>
      )}

      {/* Inline the history dashboard content (stats + table) */}
      <div style={styles.section}>
        <InlineGameHistory fetcher={historyFetcher} />
      </div>
    </div>
  );
}

function LiveFeedPanel() {
  const [events, setEvents] = useState(() => seedEvents());
  // Mock streaming: push a new event every 6s and trim to 12 items
  useEffect(() => {
    const id = setInterval(() => {
      setEvents(prev => {
        const next = [generateEvent(), ...prev].slice(0, 12);
        return next;
      });
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <section aria-label="Live feed of ongoing games and wagers" style={{ ...styles.card, ...styles.liveCard }}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Live Stream</h2>
        <span style={styles.badge}>Realtime</span>
      </div>

      {events.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon} aria-hidden="true">🌊</div>
          <div style={styles.emptyTitle}>Nothing live right now</div>
          <div style={styles.emptySub}>Check back soon. New wagers will appear here.</div>
        </div>
      ) : (
        <ul style={styles.feedList} aria-label="Live wagers list">
          {events.map(e => (
            <li key={e.id} style={styles.feedRow}>
              <div style={styles.feedUserBlock}>
                <div style={styles.avatar}>{e.user[0]?.toUpperCase()}</div>
                <div style={styles.userMeta}>
                  <div style={styles.userName}>{e.user}</div>
                  <div style={styles.userSub}>{formatTime(e.timestamp)}</div>
                </div>
              </div>

              <div style={styles.feedMid}>
                <span style={styles.midLabel}>Status</span>
                <StatusPill status={e.status} />
              </div>

              <div style={styles.feedRight}>
                <div style={styles.amount}>
                  {e.wagerEth.toFixed(2)} ETH
                </div>
                <div style={styles.matchup}>
                  vs {e.opponent}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusPill({ status }) {
  const map = {
    'pending-deposits': { text: 'Pending Deposits', bg: '#FEF3C7', border: '#F59E0B', color: '#92400E' },
    'in-progress': { text: 'In-Progress', bg: '#DBEAFE', border: '#2563EB', color: '#1E3A8A' },
    'settling': { text: 'Settling', bg: '#E0E7FF', border: '#6366F1', color: '#3730A3' },
    'complete': { text: 'Complete', bg: '#ECFDF5', border: '#10B981', color: '#065F46' },
    'cancelled': { text: 'Cancelled', bg: '#F3F4F6', border: '#E5E7EB', color: '#6B7280' },
  };
  const p = map[status] || map['pending-deposits'];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      background: p.bg,
      border: `1px solid ${p.border}66`,
      color: p.color,
      fontSize: 12,
      fontWeight: 800,
    }}>
      {p.text}
    </span>
  );
}

function PlaceBetPanel() {
  // Mock place bet UI only; logs values on submit.
  const [matchId, setMatchId] = useState('');
  const [amount, setAmount] = useState('0.10');
  const [note, setNote] = useState('');

  const presets = ['0.05', '0.10', '0.25', '0.50', '1.00'];

  const onSubmit = (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log('Place bet (mock):', { matchId, amount: Number(amount), note });
    setNote('Wager placed (mock). Integrate with escrow and matchmaking flow.');
    setTimeout(() => setNote(''), 1800);
  };

  return (
    <section aria-label="Place a wager" style={{ ...styles.card, ...styles.placeCard }}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Place Bet</h2>
      </div>

      <form onSubmit={onSubmit} style={styles.formCol}>
        <label style={styles.label}>
          Match
          <select
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            required
            style={styles.input}
          >
            <option value="" disabled>Select a match</option>
            <option value="match-1">vs StormRider · Best of 1</option>
            <option value="match-2">vs BlueWhale · Best of 3</option>
            <option value="match-3">vs TidalWave · Best of 1</option>
          </select>
        </label>

        <label style={styles.label}>
          Amount (ETH)
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.10"
            style={styles.input}
            required
          />
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              style={{ ...styles.pillBtn, ...(amount === p ? styles.pillBtnActive : null) }}
              aria-pressed={amount === p}
            >
              {p} ETH
            </button>
          ))}
        </div>

        <button type="submit" style={styles.submitBtn}>
          Place Wager
        </button>

        {note && <div style={styles.noteOk} role="status">{note}</div>}
      </form>
    </section>
  );
}

function InlineGameHistory({ fetcher }) {
  // Render GameHistoryDashboard inline by neutralizing overlay
  return (
    <div style={inlineStyles.shell}>
      <GameHistoryDashboard open onClose={() => { /* page context */ }} fetcher={fetcher} />
      <style>
        {`
          [data-inline-history] {
            display: block;
            position: static !important;
            inset: auto !important;
            background: transparent !important;
            padding: 0 !important;
          }
        `}
      </style>
    </div>
  );
}

/* Utilities and mock data */
function seedEvents() {
  return [
    { id: 'e-1', user: 'AquaKnight', opponent: 'StormRider', wagerEth: 0.20, status: 'pending-deposits', timestamp: Date.now() - 1000 * 60 * 1 },
    { id: 'e-2', user: 'CoralMage', opponent: 'BlueWhale', wagerEth: 0.45, status: 'in-progress', timestamp: Date.now() - 1000 * 60 * 3 },
    { id: 'e-3', user: 'SeaBreeze', opponent: 'TideBreaker', wagerEth: 0.15, status: 'settling', timestamp: Date.now() - 1000 * 60 * 8 },
    { id: 'e-4', user: 'Mariner', opponent: 'Neptune', wagerEth: 0.60, status: 'complete', timestamp: Date.now() - 1000 * 60 * 15 },
  ];
}
function generateEvent() {
  const users = ['AquaKnight', 'CoralMage', 'SeaBreeze', 'Mariner', 'TidalWave', 'PearlGuard', 'HarborFox'];
  const foes = ['StormRider', 'BlueWhale', 'TideBreaker', 'Neptune', 'CoralBlade', 'KrakenEye'];
  const statuses = ['pending-deposits', 'in-progress', 'settling', 'complete', 'cancelled'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return {
    id: `e-${Math.random().toString(36).slice(2, 9)}`,
    user: pick(users),
    opponent: pick(foes),
    wagerEth: Number((Math.random() * 0.9 + 0.1).toFixed(2)),
    status: pick(statuses),
    timestamp: Date.now(),
  };
}
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* Ocean Professional page styles */
const styles = {
  pageWrap: {
    minHeight: '100vh',
    background: '#f9fafb',
    paddingBottom: 40,
  },
  pageHeader: {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '20px 16px 0',
    display: 'flex',
    alignItems: 'flex-start',
  },
  title: {
    margin: '0 0 4px',
    fontWeight: 900,
    color: '#111827',
    fontSize: 28,
  },
  subtitle: {
    margin: 0,
    color: '#374151',
    fontSize: 14,
  },
  closeButton: {
    marginLeft: 'auto',
    border: 'none',
    background: '#FFFFFF',
    color: '#111827',
    width: 36,
    height: 36,
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1,
    boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
    borderBottom: '2px solid #E5E7EB',
  },
  section: {
    maxWidth: 1180,
    margin: '16px auto 0',
    padding: '0 16px',
  },
  topRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: 16,
    alignItems: 'stretch',
  },
  card: {
    padding: '14px',
    background: '#ffffff',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
  },
  liveCard: {
    minHeight: 260,
  },
  placeCard: {
    minHeight: 260,
  },
  liveGamePlaceholder: {
    marginBottom: 12,
  },
  liveGameBody: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1fr',
    gap: 12,
    alignItems: 'stretch',
  },
  liveGameScreen: {
    minHeight: 220,
    borderRadius: 12,
    border: '1px solid #E5E7EB',
    background: 'linear-gradient(135deg, #DBEAFE 0%, #E5E7EB 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
  },
  liveGameLabel: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontSize: 12,
    fontWeight: 800,
    color: '#1E3A8A',
    background: '#BFDBFE',
    border: '1px solid #93C5FD',
    borderRadius: 999,
    padding: '4px 8px',
  },
  liveGameMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  liveGameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: '8px 10px',
  },
  metaLabel: { fontSize: 12, color: '#6B7280', fontWeight: 800 },
  metaValue: { fontSize: 13, color: '#111827', fontWeight: 700 },
  metaValueStrong: { fontSize: 13, color: '#111827', fontWeight: 900 },
  liveGameNote: {
    marginTop: 4,
    fontSize: 12,
    color: '#374151',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: '#111827',
  },
  badge: {
    fontSize: 12,
    fontWeight: 800,
    color: '#2563EB',
    background: '#EEF2FF',
    border: '1px solid #2563EB33',
    padding: '2px 8px',
    borderRadius: 999,
  },
  feedList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 10,
  },
  feedRow: {
    display: 'grid',
    gridTemplateColumns: '1.8fr 1fr 1fr',
    alignItems: 'center',
    gap: 10,
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: '10px 12px',
    background: '#FFFFFF',
  },
  feedUserBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#DBEAFE',
    border: '1px solid #93C5FD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    color: '#1E3A8A',
    fontSize: 14,
  },
  userMeta: { display: 'flex', flexDirection: 'column' },
  userName: { fontWeight: 900, color: '#111827', fontSize: 14 },
  userSub: { color: '#6B7280', fontSize: 12 },
  feedMid: { display: 'flex', alignItems: 'center', gap: 8 },
  midLabel: { color: '#6B7280', fontSize: 12, fontWeight: 700 },
  feedRight: { textAlign: 'right' },
  amount: { fontWeight: 900, color: '#111827' },
  matchup: { fontSize: 12, color: '#6B7280', fontWeight: 700 },
  formCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    fontWeight: 800,
    color: '#374151',
  },
  input: {
    height: 38,
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    padding: '0 10px',
    background: '#FFFFFF',
    color: '#111827',
    outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
  },
  pillBtn: {
    border: '1px solid #E5E7EB',
    background: '#F9FAFB',
    color: '#111827',
    borderRadius: 999,
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 12,
  },
  pillBtnActive: {
    background: '#2563EB',
    color: '#FFFFFF',
    borderColor: '#2563EB',
  },
  submitBtn: {
    marginTop: 6,
    background: '#2563EB',
    color: '#FFFFFF',
    border: '1px solid transparent',
    padding: '10px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
  },
  noteOk: {
    fontSize: 12,
    color: '#065F46',
    background: '#ECFDF5',
    border: '1px solid #A7F3D0',
    padding: '6px 8px',
    borderRadius: 8,
  },
};

const inlineStyles = {
  shell: { position: 'relative' },
};
