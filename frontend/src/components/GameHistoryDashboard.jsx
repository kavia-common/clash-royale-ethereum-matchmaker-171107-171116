import React, { useEffect, useMemo, useState } from 'react';

/**
 * Ocean Professional theme tokens for Game History Dashboard.
 */
const theme = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
};

/**
 * PUBLIC_INTERFACE
 * GameHistoryDashboard
 * A read-only dashboard that shows:
 * - Win/Loss record
 * - List of past games (date, opponent, wager, result, profit/loss)
 * - Total profit/loss aggregates
 *
 * Props:
 * - open: boolean - whether to show the dashboard modal
 * - onClose: function - close handler
 * - fetcher: optional async function to fetch game history: () => Promise<{ stats: {wins, losses}, games: Array }>
 *
 * Backend expectations (for future integration):
 * - GET /games/history -> {
 *     stats: { wins: number, losses: number, totalProfitEth?: number },
 *     games: Array<{
 *       id: string,
 *       date: string,             // ISO string
 *       opponent: string,
 *       wagerEth: number,
 *       result: 'win' | 'loss' | 'draw' | 'cancelled',
 *       profitEth?: number        // positive for wins (net), negative for losses (net), 0 for draw/cancel
 *     }>
 *   }
 * - Optionally accept Authorization header if you require authenticated access.
 *
 * For now, we use mocked data if no fetcher is provided.
 */
export default function GameHistoryDashboard({ open, onClose, fetcher }) {
  /** This is a public function. */
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ wins: 0, losses: 0 });
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');

  // Mocked data (can be replaced by backend via fetcher prop)
  const mockData = useMemo(
    () => ({
      stats: { wins: 8, losses: 5 },
      games: [
        {
          id: 'g-101',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
          opponent: 'AquaKnight',
          wagerEth: 0.25,
          result: 'win',
          profitEth: 0.23,
        },
        {
          id: 'g-102',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          opponent: 'StormRider',
          wagerEth: 0.75,
          result: 'loss',
          profitEth: -0.77,
        },
        {
          id: 'g-103',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          opponent: 'CoralMage',
          wagerEth: 0.5,
          result: 'win',
          profitEth: 0.48,
        },
        {
          id: 'g-104',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          opponent: 'BlueWhale',
          wagerEth: 0.15,
          result: 'draw',
          profitEth: 0.0,
        },
      ],
    }),
    []
  );

  useEffect(() => {
    if (!open) return;
    let canceled = false;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        if (typeof fetcher === 'function') {
          const res = await fetcher();
          if (canceled) return;
          setStats(res?.stats || { wins: 0, losses: 0 });
          setGames(Array.isArray(res?.games) ? res.games : []);
        } else {
          // Use mocked data until backend is integrated
          await new Promise((r) => setTimeout(r, 250));
          if (canceled) return;
          setStats(mockData.stats);
          setGames(mockData.games);
        }
      } catch (e) {
        if (!canceled) {
          setError(e?.message || 'Failed to load game history.');
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    run();
    return () => {
      canceled = true;
    };
  }, [open, fetcher, mockData]);

  const totals = useMemo(() => {
    const totalProfit = games.reduce((acc, g) => acc + (Number(g.profitEth) || 0), 0);
    const totalWagered = games.reduce((acc, g) => acc + (Number(g.wagerEth) || 0), 0);
    return {
      totalProfit,
      totalWagered,
    };
  }, [games]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-dashboard-title"
      aria-describedby="history-dashboard-desc"
      style={styles.overlay}
      data-inline-history
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 id="history-dashboard-title" style={styles.title}>Game History</h2>
          <button
            type="button"
            aria-label="Close game history"
            onClick={onClose}
            style={styles.iconButton}
          >
            ×
          </button>
        </div>
        <p id="history-dashboard-desc" style={styles.subtitle}>
          Review your past games, win/loss record, and profit over time. Data will reflect live stats once integrated with the backend.
        </p>

        {error && <div role="alert" style={styles.errorBanner}>{error}</div>}

        {/* KPIs */}
        <div style={styles.kpiGrid}>
          <KPI label="Wins" value={stats.wins} tone="success" />
          <KPI label="Losses" value={stats.losses} tone="error" />
          <KPI
            label="Total Profit"
            value={`${formatEth(totals.totalProfit)} ETH`}
            tone={totals.totalProfit >= 0 ? 'success' : 'error'}
          />
          <KPI
            label="Total Wagered"
            value={`${formatEth(totals.totalWagered)} ETH`}
            tone="info"
          />
        </div>

        {/* List */}
        <section aria-label="Past games list" style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Past Games</h3>
            <span style={styles.infoText}>
              Latest first
            </span>
          </div>

          {loading ? (
            <div style={styles.loadingRow}>
              <Spinner />
              <span style={styles.loadingText}>Loading game history…</span>
            </div>
          ) : games.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon} aria-hidden="true">🌊</div>
              <div style={styles.emptyTitle}>No games yet</div>
              <div style={styles.emptySub}>Play your first match and deposits to see stats here.</div>
            </div>
          ) : (
            <ul style={styles.table} aria-label="Game rows">
              <li style={{ ...styles.row, ...styles.headerRow }} aria-hidden="true">
                <div style={styles.cellDate}>Date</div>
                <div style={styles.cellOpponent}>Opponent</div>
                <div style={styles.cellWager}>Wager (ETH)</div>
                <div style={styles.cellResult}>Result</div>
                <div style={styles.cellProfit}>P/L (ETH)</div>
              </li>
              {[...games]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((g) => (
                  <li key={g.id} style={styles.row}>
                    <div style={styles.cellDate}>{formatDate(g.date)}</div>
                    <div style={styles.cellOpponent}>{g.opponent || 'Unknown'}</div>
                    <div style={styles.cellWager}>{formatEth(g.wagerEth)}</div>
                    <div style={styles.cellResult}>
                      <ResultPill result={g.result} />
                    </div>
                    <div style={styles.cellProfit}>
                      <Profit value={Number(g.profitEth) || 0} />
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* Integration note */}
        <div style={styles.noteBox}>
          <strong>Integration note: </strong>
          Replace mocked data by providing a <code>fetcher</code> prop that calls your backend
          endpoint (e.g., GET <code>/games/history</code>) and returns
          <code> {`{ stats: { wins, losses, totalProfitEth? }, games: [...] }`} </code>.
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, tone = 'info' }) {
  const palette = {
    info: { bg: '#F9FAFB', border: theme.border, color: theme.text },
    success: { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46' },
    error: { bg: '#FEF2F2', border: '#FCA5A5', color: '#7F1D1D' },
  };
  const p = palette[tone] || palette.info;
  return (
    <div style={{ ...styles.kpi, background: p.bg, border: `1px solid ${p.border}`, color: p.color }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
    </div>
  );
}

function Spinner() {
  return <div aria-label="Loading" role="status" style={styles.spinner} />;
}

function ResultPill({ result }) {
  const map = {
    win: { label: 'Win', bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46' },
    loss: { label: 'Loss', bg: '#FEF2F2', border: '#FCA5A5', color: '#7F1D1D' },
    draw: { label: 'Draw', bg: '#F3F4F6', border: theme.border, color: theme.text },
    cancelled: { label: 'Cancelled', bg: '#F3F4F6', border: theme.border, color: theme.muted },
  };
  const p = map[result] || map.draw;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      borderRadius: 999,
      background: p.bg,
      border: `1px solid ${p.border}`,
      color: p.color,
      fontSize: 12,
      fontWeight: 800,
    }}>
      {p.label}
    </span>
  );
}

function Profit({ value }) {
  const positive = value > 0;
  const negative = value < 0;
  return (
    <span style={{
      fontWeight: 800,
      color: positive ? '#065F46' : negative ? '#7F1D1D' : theme.text,
    }}>
      {positive ? '+' : negative ? '' : ''}{formatEth(value)}
    </span>
  );
}

function formatEth(n) {
  const v = Number(n || 0);
  return v.toFixed(2);
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(iso);
  }
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(17, 24, 39, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 980,
    background: theme.surface,
    color: theme.text,
    borderRadius: 14,
    boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
    padding: 20,
    border: `1px solid ${theme.border}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: theme.text,
  },
  subtitle: {
    margin: '0 0 14px',
    color: '#374151',
    fontSize: 14,
  },
  iconButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
    color: '#6B7280',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  kpi: {
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.muted,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 900,
  },
  card: {
    background: '#FFFFFF',
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    minHeight: 160,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: theme.text,
  },
  infoText: {
    fontSize: 12,
    color: theme.muted,
  },
  table: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 8,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.2fr 1fr 0.8fr 1fr',
    alignItems: 'center',
    gap: 8,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    background: '#FFFFFF',
  },
  headerRow: {
    background: '#F9FAFB',
    border: `1px solid ${theme.border}`,
    fontWeight: 800,
    color: theme.muted,
  },
  cellDate: { fontSize: 13, color: theme.text, fontWeight: 700 },
  cellOpponent: { fontSize: 13, color: theme.text },
  cellWager: { fontSize: 13, color: theme.text, fontWeight: 800 },
  cellResult: { fontSize: 13 },
  cellProfit: { fontSize: 13, textAlign: 'right' },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    background: '#EFF6FF',
    border: '1px solid #93C5FD',
    color: '#1E3A8A',
  },
  loadingText: { fontWeight: 600, fontSize: 14 },
  empty: { textAlign: 'center', padding: '20px 8px', color: theme.muted },
  emptyIcon: { fontSize: 28, marginBottom: 6 },
  emptyTitle: { fontWeight: 800, color: theme.text },
  emptySub: { fontSize: 13, color: theme.muted },
  noteBox: {
    marginTop: 12,
    fontSize: 12,
    color: '#374151',
    background: 'linear-gradient(180deg, rgba(37,99,235,0.06), #ffffff)',
    border: `1px dashed ${theme.primary}66`,
    borderRadius: 10,
    padding: 10,
  },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '3px solid #BFDBFE',
    borderTopColor: theme.primary,
    animation: 'spin 1s linear infinite',
  },
};

// Inject simple keyframes for spinner (scoped to component load)
const styleEl = document.createElement('style');
styleEl.innerHTML = `
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
`;
document.head.appendChild(styleEl);
