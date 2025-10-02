import React, { useMemo, useState } from 'react';
import EscrowModal from './EscrowModal';

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
  const visible = useMemo(() => {
    return profiles.filter((p) => p.wagerEth >= filter.min && p.wagerEth <= filter.max);
  }, [profiles, filter]);

  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (p) => {
    setSelected(p);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
  };

  const handleInitiate = async ({ opponentId, wagerEth }) => {
    // Placeholder to integrate with backend later: create match intent
    // await fetch(`${process.env.REACT_APP_API_URL}/matches`, { method: 'POST', body: JSON.stringify({ opponentId, wagerEth }) });
    await new Promise((r) => setTimeout(r, 350));
  };

  const handleDeposit = async ({ opponentId, wagerEth }) => {
    // Placeholder to integrate with web3 later.
    // Return a mocked tx hash shaped object.
    await new Promise((r) => setTimeout(r, 1000));
    return { txHash: '0x' + Math.random().toString(16).slice(2).padEnd(10, 'a') };
  };

  if (profiles.length === 0) {
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
                  <span style={styles.username}>{p.username}</span>
                  <span style={styles.rankBadge}>{p.rank}</span>
                </div>
                <div style={styles.subtleText}>Wants to wager</div>
              </div>
            </div>

            <div style={styles.wagerRow}>
              <span style={styles.wagerLabel}>Desired Wager</span>
              <span style={styles.wagerValue}>
                {p.wagerEth.toFixed(2)} ETH
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
