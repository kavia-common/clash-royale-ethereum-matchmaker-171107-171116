import React, { useEffect, useMemo, useState } from 'react';
import EscrowModal from './EscrowModal';
import { apiCreateMatch, apiGetProfiles, apiConfirmDeposit } from '../services/api';
import { useEthereumWallet } from '../hooks/useEthereumWallet';
import { sendEscrowDeposit } from '../services/blockchain';

/**
 * Ocean Professional theme tokens mapped to CSS variables
 */
const theme = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  background: 'var(--bg)',
  surface: 'var(--surface)',
  text: 'var(--text)',
  subtle: 'var(--muted, #6B7280)',
};

/**
 * PUBLIC_INTERFACE
 * ProfileList
 * Renders a set of user profiles interested in wagering.
 * Props:
 * - profiles: Array<{ id, username, rank, avatarUrl?, wagerEth: number }>
 * - filter: { min: number, max: number }
 */
export default function ProfileList({ profiles = [], filter = { min: 0, max: Infinity } }) {
  /** This is a public function. */
  const { signer, isConnected } = useEthereumWallet();

  // If profiles provided via props, bypass API and pagination.
  const shouldUseProps = profiles && profiles.length > 0;

  // Server-backed state
  const [remoteProfiles, setRemoteProfiles] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Normalize API response to items/cursor/hasMore
  const normalizeProfilesResponse = (res) => {
    if (Array.isArray(res)) {
      return { items: res, nextCursor: null, hasMore: false };
    }
    const items = res?.items || [];
    const cursor = res?.nextCursor ?? res?.cursor ?? res?.next ?? null;
    const more = res?.hasMore ?? Boolean(cursor);
    return { items, nextCursor: cursor, hasMore: more };
  };

  const loadInitial = async () => {
    if (shouldUseProps) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiGetProfiles({ minWager: filter?.min, maxWager: filter?.max });
      const norm = normalizeProfilesResponse(res);
      setRemoteProfiles(norm.items);
      setNextCursor(norm.nextCursor);
      setHasMore(norm.hasMore);
    } catch (e) {
      setLoadError(e?.message || 'Failed to load profiles.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (shouldUseProps || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await apiGetProfiles({ minWager: filter?.min, maxWager: filter?.max, cursor: nextCursor });
      const norm = normalizeProfilesResponse(res);
      setRemoteProfiles((curr) => [...curr, ...norm.items]);
      setNextCursor(norm.nextCursor);
      setHasMore(norm.hasMore);
    } catch (e) {
      setLoadError(e?.message || 'Failed to load more profiles.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch on mount and when filter changes (server-side filtering)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (shouldUseProps) {
        setRemoteProfiles(profiles);
        setNextCursor(null);
        setHasMore(false);
        setLoading(false);
        setLoadError('');
        return;
      }
      await loadInitial();
    };
    if (!cancelled) run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, filter?.min, filter?.max]);

  const list = shouldUseProps ? profiles : remoteProfiles;

  const visible = useMemo(() => {
    // Server already filters, but keep guard for robustness
    return list.filter((p) => p.wagerEth >= filter.min && p.wagerEth <= filter.max);
  }, [list, filter]);

  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [matchId, setMatchId] = useState(null);

  const openModal = (p) => {
    setSelected(p);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setMatchId(null);
  };

  const handleInitiate = async ({ opponentId, wagerEth }) => {
    // Create match intent on backend.
    const res = await apiCreateMatch({ opponentId, wagerEth });
    const mid = res?.matchId ?? res?.id ?? null;
    setMatchId(mid);
    return { matchId: mid, ...res };
  };

  const handleDeposit = async ({ opponentId, wagerEth }) => {
    // Ensure wallet
    if (!isConnected || !signer) {
      throw new Error('Wallet not connected. Please connect your wallet.');
    }
    // Send escrow deposit tx
    const depositRes = await sendEscrowDeposit({
      signer,
      matchId: matchId ?? 0,
      amountEth: wagerEth,
    });
    // Notify backend with tx hash if we have a match id
    if (matchId && depositRes?.txHash) {
      try {
        await apiConfirmDeposit({ matchId, txHash: depositRes.txHash });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to confirm deposit with backend. You may need to refresh status manually.', e);
      }
    }
    return { txHash: depositRes?.txHash };
  };

  if (loading) {
    return (
      <section style={styles.container}>
        <div style={styles.bannerInfo} role="status">Loading profiles…</div>
        <div style={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <article key={`skeleton-${i}`} style={styles.card}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ ...styles.avatarWrap, background: '#E5E7EB' }} />
                <div style={{ flex: 1 }}>
                  <div style={styles.skelLineWide} />
                  <div style={styles.skelLine} />
                </div>
              </div>
              <div style={{ ...styles.wagerRow, background: '#F3F4F6' }}>
                <div style={styles.skelLineShort} />
                <div style={styles.skelLineShort} />
              </div>
              <div style={styles.actions}>
                <div style={styles.skelButton} />
                <div style={{ ...styles.skelButton, width: 80 }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (loadError && !visible.length) {
    return (
      <section style={styles.container}>
        <div style={styles.bannerError} role="alert">
          {loadError}
          <button type="button" style={styles.retryBtn} onClick={() => { setLoadError(''); setTimeout(loadInitial, 0); }}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (list.length === 0) {
    return (
      <section style={styles.container}>
        <EmptyState message="No profiles available yet." />
      </section>
    );
  }

  if (visible.length === 0) {
    return (
      <section style={styles.container}>
        <EmptyState message="No profiles match the current wager filter." />
      </section>
    );
  }

  return (
    <section style={styles.container} aria-label="Profile list">
      {loadError && (
        <div style={styles.bannerWarning} role="status">
          {loadError}{' '}
          <button type="button" style={styles.retryInline} onClick={() => { setLoadError(''); if (!remoteProfiles.length) loadInitial(); }}>
            Retry
          </button>
        </div>
      )}
      <div style={styles.grid}>
        {visible.map((p) => (
          <article key={p.id} style={styles.card} aria-label={`${p.username} profile card`}>
            <div style={styles.header}>
              <div style={styles.avatarWrap}>
                {p.avatarUrl ? (
                  <img
                    alt={`${p.username} avatar`}
                    src={p.avatarUrl}
                    style={styles.avatar}
                  />
                ) : (
                  <div style={styles.avatarPlaceholder} aria-hidden="true">
                    {p.username?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
              </div>
              <div style={styles.meta}>
                <div style={styles.usernameRow}>
                  <span style={styles.username} data-testid="profile-username">{p.username}</span>
                  <span style={styles.rankBadge}>{p.rank}</span>
                </div>
                <div style={styles.subtleText}>Wants to wager</div>
              </div>
            </div>

            <div style={styles.wagerRow}>
              <span style={styles.wagerLabel}>Desired Wager</span>
              <span style={styles.wagerValue}>
                {Number(p.wagerEth).toFixed(2)} ETH
              </span>
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.primaryButton}
                aria-label={`Challenge ${p.username}`}
                onClick={() => openModal(p)}
              >
                Challenge
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                aria-label={`View ${p.username} details`}
              >
                View
              </button>
            </div>
          </article>
        ))}
      </div>

      {!shouldUseProps && hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              ...styles.primaryButton,
              minWidth: 160,
              opacity: loadingMore ? 0.7 : 1,
            }}
            aria-label="Load more profiles"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}

      <EscrowModal
        open={modalOpen}
        onClose={closeModal}
        challenger={null}
        opponent={selected || undefined}
        defaultWager={selected?.wagerEth}
        onInitiate={handleInitiate}
        onDeposit={handleDeposit}
        onComplete={() => {}}
      />
    </section>
  );
}

function EmptyState({ message }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon} aria-hidden="true">🌊</div>
      <div style={styles.emptyTitle}>Nothing to show</div>
      <div style={styles.emptySub}>{message}</div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    background: `linear-gradient(135deg, rgba(37,99,235,0.06), rgba(249,250,251,1))`,
    padding: 16,
    borderRadius: 16,
    border: '1px solid #E5E7EB',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  card: {
    background: theme.surface,
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
  },
  header: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    overflow: 'hidden',
    background: '#EFF6FF',
    border: `1px solid ${theme.primary}22`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.primary,
    fontWeight: 800,
    fontSize: 18,
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
  },
  usernameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: theme.text,
    fontWeight: 800,
  },
  rankBadge: {
    fontSize: 12,
    color: theme.primary,
    background: '#EEF2FF',
    border: `1px solid ${theme.primary}33`,
    padding: '2px 8px',
    borderRadius: 999,
    fontWeight: 700,
  },
  subtleText: {
    color: theme.subtle,
    fontSize: 12,
  },
  wagerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: '8px 10px',
  },
  wagerLabel: {
    color: theme.subtle,
    fontSize: 12,
    fontWeight: 600,
  },
  wagerValue: {
    color: theme.text,
    fontWeight: 800,
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  primaryButton: {
    background: theme.primary,
    color: '#ffffff',
    border: '1px solid transparent',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
  },
  secondaryButton: {
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #E5E7EB',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  empty: {
    textAlign: 'center',
    padding: '36px 12px',
    color: theme.subtle,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyTitle: {
    fontWeight: 800,
    color: theme.text,
  },
  emptySub: {
    fontSize: 14,
    color: theme.subtle,
  },
  bannerError: {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#B91C1C',
    padding: '10px 12px',
    borderRadius: 10,
    marginBottom: 12,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerWarning: {
    background: '#FFFBEB',
    border: '1px solid #FDE68A',
    color: '#92400E',
    padding: '8px 10px',
    borderRadius: 10,
    marginBottom: 12,
  },
  bannerInfo: {
    background: '#EFF6FF',
    border: '1px solid #DBEAFE',
    color: '#1E3A8A',
    padding: '8px 10px',
    borderRadius: 10,
    marginBottom: 12,
  },
  retryBtn: {
    background: theme.primary,
    color: '#ffffff',
    border: '1px solid transparent',
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700,
  },
  retryInline: {
    background: 'transparent',
    color: '#92400E',
    border: '1px dashed #F59E0B',
    padding: '4px 8px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700,
    marginLeft: 8,
  },
  skelLine: {
    height: 10,
    width: '60%',
    background: '#E5E7EB',
    borderRadius: 6,
    marginTop: 6,
  },
  skelLineWide: {
    height: 12,
    width: '80%',
    background: '#E5E7EB',
    borderRadius: 6,
  },
  skelLineShort: {
    height: 12,
    width: 90,
    background: '#E5E7EB',
    borderRadius: 6,
  },
  skelButton: {
    height: 36,
    width: 120,
    background: '#E5E7EB',
    borderRadius: 10,
  },
};
