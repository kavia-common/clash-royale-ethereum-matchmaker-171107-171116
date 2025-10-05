import React, { useEffect, useMemo, useState } from 'react';
import { apiGetCRPlayer, apiGetCRFavoriteCards } from '../services/api';

/**
 * Ocean Professional theme tokens for Clash Royale dashboard
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

// PUBLIC_INTERFACE
export default function ClashRoyaleDashboard({ open, onClose, playerTag, accessToken }) {
  /**
   * PUBLIC_INTERFACE
   * ClashRoyaleDashboard
   * Read-only panel that shows a linked player's Clash Royale stats.
   * Props:
   * - open: boolean - if true, shows the dashboard; if false returns null
   * - onClose: function - close handler
   * - playerTag: string (e.g., '#2ABC3D') - normalized tag for the player
   * - accessToken: string - user-scoped token or backend session token used by your backend to call Supercell API
   *
   * Notes:
   * - This component calls your backend (not Supercell directly) to comply with CORS and token security.
   * - Only reads public profile and basic stats; no gameplay or manipulation.
   */

  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState('');

  const normalizedTag = useMemo(() => {
    if (!playerTag) return '';
    const t = String(playerTag).trim().toUpperCase();
    return t.startsWith('#') ? t : `#${t}`;
  }, [playerTag]);

  useEffect(() => {
    if (!open) return;
    if (!normalizedTag) return;

    let canceled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch player
        const p = await apiGetCRPlayer({ tag: normalizedTag, token: accessToken });
        if (canceled) return;
        setPlayer(p || null);

        // Optionally fetch favorite cards/decks (backend should map from battle log or player cards)
        const fav = await apiGetCRFavoriteCards({ tag: normalizedTag, token: accessToken });
        if (!canceled) setFavorites(Array.isArray(fav) ? fav.slice(0, 8) : []);
      } catch (e) {
        if (!canceled) {
          setError(e?.message || 'Failed to load Clash Royale stats.');
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [open, normalizedTag, accessToken]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cr-dashboard-title"
      aria-describedby="cr-dashboard-desc"
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 id="cr-dashboard-title" style={styles.title}>Clash Royale — Linked Account</h2>
          <button
            type="button"
            aria-label="Close dashboard"
            onClick={onClose}
            style={styles.iconButton}
          >
            ×
          </button>
        </div>
        <p id="cr-dashboard-desc" style={styles.subtitle}>
          Read-only view of your Clash Royale profile and recent stats fetched via the official API.
        </p>

        {/* Status */}
        {error && <div role="alert" style={styles.errorBanner}>{error}</div>}
        {loading && (
          <div style={styles.loadingRow}>
            <Spinner />
            <span style={styles.loadingText}>Loading player stats…</span>
          </div>
        )}

        {/* Content */}
        {!loading && player && (
          <div style={styles.grid}>
            <section aria-label="Player summary" style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Player</h3>
                <span style={styles.badge}>Profile</span>
              </div>
              <div style={styles.playerRow}>
                <div style={styles.avatar}>{(player?.name?.[0] || '?').toUpperCase()}</div>
                <div style={styles.playerMeta}>
                  <div style={styles.playerName}>
                    {player?.name || 'Unknown'}
                  </div>
                  <div style={styles.playerSub}>
                    Tag {normalizedTag}
                  </div>
                </div>
              </div>
              <div style={styles.statsRow}>
                <Stat label="Trophies" value={player?.trophies} />
                <Stat label="Best Trophies" value={player?.bestTrophies} />
                <Stat label="Level" value={player?.expLevel} />
                <Stat label="Wins" value={player?.wins} />
                <Stat label="Losses" value={player?.losses} />
              </div>
            </section>

            <section aria-label="Clan" style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Clan</h3>
                <span style={styles.badge}>Social</span>
              </div>
              {player?.clan ? (
                <>
                  <div style={styles.clanName}>{player.clan.name}</div>
                  <div style={styles.clanSub}>Role: {player?.role || 'Member'}</div>
                </>
              ) : (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon} aria-hidden="true">🏰</div>
                  <div style={styles.emptyTitle}>No clan</div>
                  <div style={styles.emptySub}>Join a clan to see more insights.</div>
                </div>
              )}
            </section>

            <section aria-label="Favorite cards" style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Favorites</h3>
                <span style={styles.badge}>Cards</span>
              </div>
              {favorites && favorites.length > 0 ? (
                <ul style={styles.cardGrid} aria-label="Favorite cards list">
                  {favorites.map((c, idx) => (
                    <li key={`${c?.id || c?.name || 'card'}-${idx}`} style={styles.cardPill}>
                      <span style={styles.cardEmoji} aria-hidden="true">🃏</span>
                      <span style={styles.cardText}>{c?.name || 'Card'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon} aria-hidden="true">🃏</div>
                  <div style={styles.emptyTitle}>No favorites</div>
                  <div style={styles.emptySub}>Play some matches to build card stats.</div>
                </div>
              )}
            </section>
          </div>
        )}

        {!loading && !player && !error && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon} aria-hidden="true">🌊</div>
            <div style={styles.emptyTitle}>No player data</div>
            <div style={styles.emptySub}>Link your account first, then reload this panel.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.statBox}>
      <div style={styles.statValue}>{value ?? '—'}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function Spinner() {
  return <div aria-label="Loading" role="status" style={styles.spinner} />;
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
  errorBanner: {
    padding: '10px 12px',
    borderRadius: 10,
    background: '#FEF2F2',
    color: theme.error,
    border: `1px solid ${theme.error}33`,
    fontSize: 14,
    marginBottom: 10,
  },
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: 16,
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
  badge: {
    fontSize: 12,
    fontWeight: 800,
    color: theme.primary,
    background: '#EEF2FF',
    border: `1px solid ${theme.primary}33`,
    padding: '2px 8px',
    borderRadius: 999,
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: theme.text,
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: '50%',
    background: '#DBEAFE',
    border: '1px solid #93C5FD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    color: '#1E3A8A',
    fontSize: 18,
  },
  playerMeta: { display: 'flex', flexDirection: 'column' },
  playerName: { fontWeight: 900, fontSize: 16, color: theme.text },
  playerSub: { color: theme.muted, fontSize: 12 },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: 10,
    marginTop: 6,
  },
  statBox: {
    background: '#F9FAFB',
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: '8px 10px',
    textAlign: 'center',
  },
  statValue: { fontSize: 16, fontWeight: 900, color: theme.text },
  statLabel: { fontSize: 12, color: theme.muted, fontWeight: 700 },
  clanName: { fontWeight: 900, color: theme.text, fontSize: 16 },
  clanSub: { color: theme.muted, fontSize: 12 },
  empty: { textAlign: 'center', padding: '20px 8px', color: theme.muted },
  emptyIcon: { fontSize: 28, marginBottom: 6 },
  emptyTitle: { fontWeight: 800, color: theme.text },
  emptySub: { fontSize: 13, color: theme.muted },
  cardGrid: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
    gap: 8,
  },
  cardPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: '#F9FAFB',
  },
  cardEmoji: { fontSize: 14 },
  cardText: { fontSize: 12, fontWeight: 700, color: theme.text },
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
