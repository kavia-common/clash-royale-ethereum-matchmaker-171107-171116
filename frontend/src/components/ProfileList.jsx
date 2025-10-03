import React, { useEffect, useMemo, useState } from 'react';
import EscrowModal from './EscrowModal';
import { apiCreateMatch, apiGetProfiles, apiConfirmDeposit } from '../services/api';
import { useEthereumWallet } from '../hooks/useEthereumWallet';
import { sendEscrowDeposit } from '../services/blockchain';

/**
 * Ocean Professional theme tokens
 */
const theme = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  subtle: '#6B7280',
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

  // Local list; if props provided we fallback to props; otherwise pull from API.
  const [remoteProfiles, setRemoteProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    // If parent passed profiles, don't load from API unless empty.
    if (profiles && profiles.length > 0) {
      setRemoteProfiles(profiles);
      return;
    }
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await apiGetProfiles();
        if (!mounted) return;
        // Expecting an array of { id, username, rank, avatarUrl?, wagerEth }
        setRemoteProfiles(Array.isArray(res) ? res : (res?.items || []));
      } catch (e) {
        setLoadError(e?.message || 'Failed to load profiles.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  const list = profiles && profiles.length > 0 ? profiles : remoteProfiles;

  const visible = useMemo(() => {
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
    // Backend should return an object like { matchId, ... }
    const res = await apiCreateMatch({ opponentId, wagerEth });
    // Accept several shapes, prefer res.matchId, else res.id
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
        <EmptyState message="Loading profiles…" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section style={styles.container}>
        <EmptyState message={loadError} />
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
};
