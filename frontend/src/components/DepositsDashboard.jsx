import React, { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useEthereumWallet, truncateAddress } from '../hooks/useEthereumWallet';

/**
 * Ocean Professional theme tokens for deposits dashboard
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
 * DepositsDashboard
 * A dashboard section that:
 * - Shows wallet connection and current ETH balance
 * - Provides an ETH deposit panel to initiate escrow/contract deposits
 * - Lists pending deposit/escrow requests (mocked until backend integration)
 *
 * Props:
 * - pendingRequests: optional array of pending request objects to display. If omitted, uses a mocked list.
 * - onDeposit: optional async function({ amountEth }) -> { txHash }, performs the actual deposit via ethers/contract.
 *   If not provided, a mocked deposit flow is used.
 */
export default function DepositsDashboard({ pendingRequests, onDeposit }) {
  /** This is a public function. */
  const { isConnected, address, connect, signer } = useEthereumWallet();

  // Balance state
  const [balanceEth, setBalanceEth] = useState('');
  const [balanceError, setBalanceError] = useState('');

  // Deposit panel state
  const [amount, setAmount] = useState('0.10');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [lastTx, setLastTx] = useState('');

  // Pending list (mock if not provided)
  const mocked = useMemo(
    () => ([
      { id: 'req-101', opponent: 'AquaKnight', amountEth: 0.25, status: 'awaiting-opponent' },
      { id: 'req-102', opponent: 'StormRider', amountEth: 0.75, status: 'pending' },
    ]),
    []
  );

  const items = Array.isArray(pendingRequests) ? pendingRequests : mocked;

  // Fetch balance when connected
  useEffect(() => {
    let canceled = false;
    async function readBalance() {
      setBalanceError('');
      setBalanceEth('');
      try {
        if (!isConnected || !signer) return;
        const provider = signer.provider;
        if (!provider) return;
        const bal = await provider.getBalance(address);
        if (canceled) return;
        setBalanceEth(ethers.utils.formatEther(bal));
      } catch (e) {
        if (!canceled) {
          setBalanceError(e?.message || 'Failed to read balance');
        }
      }
    }
    readBalance();
    return () => {
      canceled = true;
    };
  }, [isConnected, signer, address]);

  const canDeposit = useMemo(() => {
    const n = Number(amount);
    return isConnected && signer && Number.isFinite(n) && n > 0;
  }, [isConnected, signer, amount]);

  const handleDeposit = async () => {
    setSendError('');
    setSending(true);
    setLastTx('');
    try {
      // If provided, call prop-based onDeposit
      if (typeof onDeposit === 'function') {
        const res = await onDeposit({ amountEth: Number(amount) });
        setLastTx(res?.txHash || '');
      } else {
        // Fallback: mock a tx hash after slight delay
        await new Promise((r) => setTimeout(r, 1000));
        const mockHash = '0x' + Math.random().toString(16).slice(2).padEnd(64, '0').slice(0, 64);
        setLastTx(mockHash);
      }
    } catch (e) {
      setSendError(e?.message || 'Deposit failed or was rejected.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-label="Deposits dashboard" style={styles.wrapper}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Escrow & Deposits</h2>
        <span style={styles.badge}>ETH</span>
      </div>

      <div style={styles.grid}>
        {/* Wallet status + balance card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Wallet Status</h3>
          </div>
          <div style={styles.walletRow}>
            <span style={isConnected ? styles.connected : styles.disconnected}>
              {isConnected ? '● Connected' : '○ Disconnected'}
            </span>
            <span style={styles.addr}>
              {isConnected && address ? truncateAddress(address) : 'No wallet connected'}
            </span>
          </div>

          <div style={styles.balanceRow}>
            <div style={styles.balanceLabel}>Balance</div>
            <div style={styles.balanceValue}>
              {balanceEth !== '' ? `${Number(balanceEth).toFixed(4)} ETH` : '—'}
            </div>
          </div>
          {balanceError && (
            <div role="alert" style={styles.errorBanner}>{balanceError}</div>
          )}

          {!isConnected && (
            <button
              type="button"
              onClick={connect}
              style={styles.connectButton}
              aria-label="Connect Ethereum Wallet"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Deposit panel - visually prominent */}
        <div style={{ ...styles.card, ...styles.featuredCard }}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Deposit to Escrow</h3>
            <span style={styles.infoText}>Secure funds before a match</span>
          </div>

          <label htmlFor="deposit-amount" style={styles.inputLabel}>Amount (ETH)</label>
          <input
            id="deposit-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.input}
          />
          <div style={styles.hint}>
            Recommended gas may vary by network congestion.
          </div>

          {sendError && <div role="alert" style={styles.errorBanner}>{sendError}</div>}
          {lastTx && (
            <div style={styles.successBanner}>
              <span aria-hidden="true">✅</span>&nbsp;Submitted. Tx:&nbsp;
              <code style={styles.txHash}>{lastTx.slice(0, 20)}…</code>
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={handleDeposit}
              disabled={!canDeposit || sending}
              style={{ ...styles.primaryButton, ...(!canDeposit || sending ? styles.disabledBtn : {}) }}
              aria-disabled={!canDeposit || sending}
            >
              {sending ? 'Processing…' : 'Deposit'}
            </button>
          </div>
        </div>

        {/* Pending requests list */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Pending Requests</h3>
            <span style={styles.infoText}>Updates when counterparties act</span>
          </div>
          {(!items || items.length === 0) ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon} aria-hidden="true">🌊</div>
              <div style={styles.emptyTitle}>No pending requests</div>
              <div style={styles.emptySub}>You’ll see your in-progress escrows here.</div>
            </div>
          ) : (
            <ul style={styles.list} aria-label="Pending deposit requests">
              {items.map((r) => (
                <li key={r.id} style={styles.listItem}>
                  <div style={styles.listMain}>
                    <div style={styles.listTitle}>
                      Opponent: <strong>{r.opponent || 'Unknown'}</strong>
                    </div>
                    <div style={styles.listMeta}>
                      {Number(r.amountEth).toFixed(2)} ETH
                    </div>
                  </div>
                  <span style={statusPillStyle(r.status)} aria-label={`status: ${r.status}`}>
                    {labelForStatus(r.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function labelForStatus(status) {
  switch (status) {
    case 'awaiting-opponent':
      return 'Awaiting Opponent';
    case 'pending':
      return 'Pending';
    case 'ready':
      return 'Ready';
    case 'completed':
      return 'Completed';
    default:
      return String(status || 'Unknown');
  }
}

function statusPillStyle(status) {
  const base = {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: `1px solid ${theme.border}`,
    background: '#F3F4F6',
    color: theme.text,
    whiteSpace: 'nowrap',
  };
  if (status === 'awaiting-opponent') {
    return { ...base, background: '#FFFBEB', borderColor: '#F59E0B66', color: '#92400E' };
  }
  if (status === 'pending') {
    return { ...base, background: '#EFF6FF', borderColor: '#93C5FD', color: '#1E3A8A' };
  }
  if (status === 'ready') {
    return { ...base, background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' };
  }
  if (status === 'completed') {
    return { ...base, background: '#F3F4F6', color: '#111827' };
  }
  return base;
}

const styles = {
  wrapper: {
    width: '100%',
    background: `linear-gradient(135deg, rgba(37,99,235,0.05), rgba(249,250,251,1))`,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 16,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontWeight: 800,
    color: theme.text,
    fontSize: 18,
  },
  badge: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.primary,
    background: '#EEF2FF',
    border: `1px solid ${theme.primary}33`,
    padding: '2px 8px',
    borderRadius: 999,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  card: {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    minHeight: 180,
  },
  featuredCard: {
    background: 'linear-gradient(180deg, rgba(37,99,235,0.06), #ffffff)',
    border: `1px solid ${theme.primary}33`,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
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
  walletRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  connected: {
    color: theme.primary,
    fontWeight: 800,
    fontSize: 12,
  },
  disconnected: {
    color: theme.muted,
    fontWeight: 700,
    fontSize: 12,
  },
  addr: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    background: '#F3F4F6',
    border: `1px solid ${theme.border}`,
    padding: '4px 8px',
    borderRadius: 8,
    fontSize: 12,
    color: theme.text,
  },
  balanceRow: {
    marginTop: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#F9FAFB',
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: '8px 10px',
  },
  balanceLabel: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: 600,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: 800,
    color: theme.text,
  },
  connectButton: {
    alignSelf: 'flex-start',
    background: theme.secondary,
    color: '#111827',
    border: '1px solid transparent',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
  },
  inputLabel: {
    display: 'block',
    fontSize: 12,
    color: '#374151',
    fontWeight: 700,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    outline: 'none',
    fontSize: 14,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
  },
  hint: {
    fontSize: 12,
    color: theme.muted,
  },
  errorBanner: {
    padding: '8px 10px',
    borderRadius: 10,
    background: '#FEF2F2',
    color: theme.error,
    border: `1px solid ${theme.error}33`,
    fontSize: 14,
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 10px',
    borderRadius: 10,
    background: '#ECFDF5',
    color: '#065F46',
    border: '1px solid #A7F3D0',
    fontSize: 14,
  },
  txHash: {
    background: '#111827',
    color: '#F9FAFB',
    padding: '2px 6px',
    borderRadius: 6,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  primaryButton: {
    background: theme.primary,
    color: '#ffffff',
    border: '1px solid transparent',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
  },
  disabledBtn: {
    filter: 'grayscale(0.3)',
    opacity: 0.8,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    background: '#FFFFFF',
  },
  listMain: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
  },
  listTitle: {
    color: theme.text,
    fontWeight: 700,
  },
  listMeta: {
    color: theme.muted,
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    padding: '24px 8px',
    color: theme.muted,
  },
  emptyIcon: { fontSize: 28, marginBottom: 6 },
  emptyTitle: { fontWeight: 800, color: theme.text },
  emptySub: { fontSize: 13, color: theme.muted },
};
