import React, { useEffect, useMemo, useState } from 'react';
import EscrowModal from './EscrowModal';
import { Spinner, Banner, Skeleton } from './ui';
import { IS_API_MOCK_MODE, apiGetProfiles, apiCreateMatch } from '../services/api';
import { useAppDispatch, useAppSelector } from '../state/store';
import { setSliceLoading, setSliceError, setProfiles } from '../state/actions';
import { selectProfiles, selectWagerFilter } from '../state/selectors';

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
 * Pulls profiles and wager filter from the global store.
 */
export default function ProfileList() {
  /** This is a public function. */
  const dispatch = useAppDispatch();
  const profiles = useAppSelector(selectProfiles);
  const filter = useAppSelector(selectWagerFilter);

  // Local UI state for pagination/loading/error (store tracks base loading/error)
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Modal state
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [matchId, setMatchId] = useState(null);

  // Normalize API response to items/cursor/hasMore
  const normalizeProfilesResponse = (res) => {
    if (Array.isArray(res)) {
      return { items: res, nextCursor: null, hasMore: false };
    }
    const items = res?.items || [];
    const nextCursor = res?.nextCursor ?? res?.cursor ?? res?.next ?? null;
    const more = res?.hasMore ?? Boolean(nextCursor);
    return { items, nextCursor, hasMore: more };
  };

  // Load initial profiles based on filter
  async function loadInitial() {
    setError('');
    dispatch(setSliceLoading('profiles', true));
    dispatch(setSliceError('profiles', ''));
    try {
      const res = await apiGetProfiles({ minWager: filter?.min, maxWager: filter?.max });
      const norm = normalizeProfilesResponse(res);
      dispatch(setProfiles(norm.items));
      setCursor(norm.nextCursor);
      setHasMore(norm.hasMore);
    } catch (e) {
      const msg = e?.message || 'Failed to load profiles.';
      setError(msg);
      dispatch(setSliceError('profiles', msg));
      dispatch(setProfiles([]));
      setCursor(null);
      setHasMore(false);
    } finally {
      dispatch(setSliceLoading('profiles', false));
    }
  }

  // Load more
  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const res = await apiGetProfiles({ minWager: filter?.min, maxWager: filter?.max, cursor });
      const norm = normalizeProfilesResponse(res);
      // Merge with existing in store
      const merged = [...(profiles || []), ...(norm.items || [])];
      dispatch(setProfiles(merged));
      setCursor(norm.nextCursor);
      setHasMore(norm.hasMore);
    } catch (e) {
      setError(e?.message || 'Failed to load more profiles.');
    } finally {
      setLoadingMore(false);
    }
  }

  // React to filter changes
  useEffect(() => {
    // Reset pagination when filter changes
    setCursor(null);
    setHasMore(false);
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.min, filter?.max]);

  const visible = useMemo(() => {
    if (!profiles || !profiles.length) return [];
    // API already filters but guard on client too
    return profiles.filter((p) => {
      const w = Number(p.wagerEth);
      return w >= Number(filter?.min ?? 0) && w <= Number(filter?.max ?? Number.POSITIVE_INFINITY);
    });
  }, [profiles, filter]);

  // Challenge flow: open modal with opponent prefilled
  const onChallenge = (p) => {
    setSelected(p);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setMatchId(null);
  };

  // PUBLIC_INTERFACE
  const handleInitiate = async ({ opponentId, wagerEth }) => {
    /** Initiate wager intent via API and return the match id for the modal flow. */
    const res = await apiCreateMatch({ opponentId, wagerEth });
    const id = res?.id ?? res?.matchId ?? res?.wagerId ?? null;
    setMatchId(id);
    return { matchId: id, ...res };
  };

  // PUBLIC_INTERFACE
  const handleDeposit = async () => {
    /** Deposit is handled within EscrowModal (blockchain services). This is a placeholder for tests. */
    return { txHash: `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}` };
  };

  if ((profiles?.length || 0) === 0 && error) {
    return (
      <section style={styles.container}>
        <Banner type="error">
          <span>{error}</span>
          <button
            type="button"
            style={styles.retryBtn}
            onClick={() => loadInitial()}
          >
            Retry
          </button>
        </Banner>
      </section>
    );
  }

  if ((profiles?.length || 0) === 0 && !error) {
    // Show loading skeletons while fetching, else empty state
    return (
      <section style={styles.container}>
        <div style={styles.grid} aria-label="Loading profile skeletons">
          {[...Array(6)].map((_, i) => (
            <article key={`s-${i}`} style={styles.card}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Skeleton variant="circle" width={48} height={48} />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="80%" height={12} />
                  <Skeleton variant="text" width="60%" height={10} />
                </div>
              </div>
              <div style={styles.wagerRow}>
                <Skeleton variant="text" width={90} height={12} />
                <Skeleton variant="text" width={90} height={12} />
              </div>
              <div style={styles.actions}>
                <Skeleton variant="rect" width={120} height={36} />
                <Skeleton variant="rect" width={80} height={36} />
              </div>
            </article>
          ))}
        </div>
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
      {IS_API_MOCK_MODE && (
        <div style={{ marginBottom: 8 }}>
          <Banner type="info" inline>
            Backend not configured (REACT_APP_API_URL missing). Showing deterministic mock profiles.
          </Banner>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 12 }}>
          <Banner type="warning" inline>
            <span>{error}</span>
            <button
              type="button"
              style={styles.retryInline}
              onClick={() => { setError(''); if (!profiles.length) loadInitial(); }}
            >
              Retry
            </button>
          </Banner>
        </div>
      )}
      <div style={styles.grid}>
        {visible.map((p) => (
          <article key={p.id} style={styles.card} aria-label={`${p.username} profile card`}>
            <div style={styles.header}>
              <div style={styles.avatarWrap}>
                {p.avatarUrl ? (
                  <img alt={`${p.username} avatar`} src={p.avatarUrl} style={styles.avatar} />
                ) : (
                  <div style={styles.avatarPlaceholder} aria-hidden="true">
                    {p.username?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
              </div>
              <div style={styles.meta}>
                <div style={styles.usernameRow}>
                  <span style={styles.username} data-testid="profile-username">{p.username}</span>
                  <span style={styles.rankBadge}>{p.rank || 'Unranked'}</span>
                </div>
                <div style={styles.subtleText}>Wants to wager</div>
              </div>
            </div>

            <div style={styles.wagerRow}>
              <span style={styles.wagerLabel}>Desired Wager</span>
              <span style={styles.wagerValue}>{Number(p.wagerEth).toFixed(2)} ETH</span>
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.primaryButton}
                aria-label={`Challenge ${p.username}`}
                onClick={() => onChallenge(p)}
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

      {hasMore && (
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
        onInitiate={async ({ opponentId, wagerEth }) => {
          const res = await handleInitiate({ opponentId, wagerEth });
          setMatchId(res.matchId || res.id || null);
          return res;
        }}
        onDeposit={async ({ opponentId, wagerEth }) => {
          const res = await handleDeposit({ opponentId, wagerEth });
          return res;
        }}
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
};
