import React, { useEffect, useMemo, useState } from 'react';
import GameHistoryDashboard from '../components/GameHistoryDashboard';

// PUBLIC_INTERFACE
export default function GameHistoryPage() {
  /** GameHistoryPage: Full-page view for game history with a Live Feed at top and history stats/list below. */
  return (
    <div style={styles.pageWrap}>
      <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Game History</h1>
          <p style={styles.subtitle}>
            Track live wagers and review your past matches, win/loss, and profit.
          </p>
        </div>
      </header>

      <LiveFeedPanel />

      {/* Inline the content of the GameHistoryDashboard (using its internals in full-width).
          We reuse component by mounting it in "always open" mode with a wrapper that neutralizes the modal overlay. */}
      <div style={styles.section}>
        <InlineGameHistory />
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
    <section aria-label="Live feed of ongoing games and wagers" style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Live Feed</h2>
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

function InlineGameHistory() {
  // We mount the existing component but visually neutralize the overlay by intercepting its portal-like overlay.
  // Approach: Render the component and override its overlay CSS via a scoped wrapper to display inline.
  return (
    <div style={inlineStyles.shell}>
      <GameHistoryDashboard open onClose={() => { /* no-op in page form */ }} />
      <style>
        {`
          /* Force the modal-like overlay/content to behave inline for page rendering.
             This targets the structure in GameHistoryDashboard by overriding top-level overlay styles. */
          [data-inline-history] { display: block; }
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
  section: {
    maxWidth: 1180,
    margin: '16px auto 0',
    padding: '0 16px',
  },
  card: {
    maxWidth: 1180,
    margin: '16px auto 0',
    padding: '14px',
    background: '#ffffff',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
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
};

const inlineStyles = {
  shell: { position: 'relative' },
};
