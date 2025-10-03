import React, { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useEthereumWallet, truncateAddress } from '../hooks/useEthereumWallet';

/**
 * Ocean Professional theme tokens for the unified escrow/deposits panel
 */
const theme = {
  primary: '#2563EB', // oceany blue
  secondary: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  muted: '#E0E7FF',
  border: '#3B82F6',
};

/**
 * PUBLIC_INTERFACE
 * DepositsDashboard
 * A single, full-width blue panel that unifies:
 * - Wallet status and ETH balance
 * - Deposit to escrow action
 * - Withdraw section (placeholder action until wired)
 * - Pending requests summary
 *
 * Props:
 * - pendingRequests: optional array of pending request objects to display. If omitted, uses a mocked list.
 * - onDeposit: optional async function({ amountEth }) -> { txHash }, performs the actual deposit via ethers/contract.
 *   If not provided, a mocked deposit flow is used.
 * - onWithdraw: optional async function() -> void, performs a withdraw flow if supported.
 */
export default function DepositsDashboard({ pendingRequests, onDeposit, onWithdraw }) {
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

  // Withdraw
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawOk, setWithdrawOk] = useState(false);

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

  const handleWithdraw = async () => {
    setWithdrawError('');
    setWithdrawOk(false);
    setWithdrawing(true);
    try {
      if (typeof onWithdraw === 'function') {
        await onWithdraw();
        setWithdrawOk(true);
      } else {
        // Placeholder behavior until wired
        await new Promise((r) => setTimeout(r, 900));
        setWithdrawOk(true);
      }
    } catch (e) {
      setWithdrawError(e?.message || 'Withdraw failed or was rejected.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <section aria-label="Unified escrow and deposits panel" style={styles.wrapper}>
      {/* Full-width blue rectangle */}
      <div style={styles.oceanPanel}>
        <div style={styles.centerWrap}>
          <h1 style={styles.heroTitle}>deposit in crypto</h1>
          <div style={styles.subRow}>
            {/* Withdraw secondary action */}
            <button
              type="button"
              onClick={handleWithdraw}
              style={styles.withdrawButton}
              disabled={withdrawing}
              aria-disabled={withdrawing}
            >
              {withdrawing ? 'withdrawing…' : 'withdraw'}
            </button>
          </div>

          {/* Wallet + Balance compact row inside the blue block */}
          <div style={styles.walletCompact}>
            <span style={isConnected ? styles.dotConnected : styles.dotDisconnected} aria-hidden="true">
              {isConnected ? '●' : '○'}
            </span>
            <span style={styles.walletAddr}>
              {isConnected && address ? truncateAddress(address) : 'No wallet connected'}
            </span>
            <span style={styles.pipe} aria-hidden="true">|</span>
            <span style={styles.balanceText}>
              Balance: {balanceEth !== '' ? `${Number(balanceEth).toFixed(4)} ETH` : '—'}
            </span>
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
          {balanceError && <div role="alert" style={styles.bannerError}>{balanceError}</div>}
          {withdrawError && <div role="alert" style={styles.bannerError}>{withdrawError}</div>}
          {withdrawOk && <div role="status" style={styles.bannerSuccess}>Withdraw initiated</div>}

          {/* Deposit action inside the blue panel */}
          <div style={styles.depositBlock}>
            <label htmlFor="deposit-amount" style={styles.inputLabel}>Amount (ETH)</label>
            <div style={styles.inputRow}>
              <input
                id="deposit-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={styles.input}
              />
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
            <div style={styles.hint}>Gas may vary by network congestion.</div>
            {sendError && <div role="alert" style={styles.bannerError}>{sendError}</div>}
            {lastTx && (
              <div style={styles.bannerSuccess}>
                <span aria-hidden="true">✅</span>&nbsp;Submitted. Tx:&nbsp;
                <code style={styles.txHash}>{lastTx.slice(0, 22)}…</code>
              </div>
            )}
          </div>

          {/* Pending summary within the blue block */}
          <div style={styles.pendingWrap}>
            <div style={styles.pendingHeader}>pending escrows</div>
            {(!items || items.length === 0) ? (
              <div style={styles.pendingEmpty}>
                <span aria-hidden="true">🌊</span>&nbsp;No pending requests
              </div>
            ) : (
              <ul style={styles.pendingList} aria-label="Pending deposit requests">
                {items.map((r) => (
                  <li key={r.id} style={styles.pendingItem}>
                    <span style={styles.pendingText}>
                      {r.opponent || 'Unknown'} · {Number(r.amountEth).toFixed(2)} ETH
                    </span>
                    <span style={styles.pendingStatus}>{labelForStatus(r.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

const styles = {
  wrapper: {
    width: '100%',
  },
  oceanPanel: {
    width: '100%',
    background: `linear-gradient(180deg, #2563EB, #1D4ED8)`,
    color: '#EAF2FF',
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    boxShadow: '0 16px 28px rgba(29,78,216,0.25)',
  },
  centerWrap: {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '28px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    textAlign: 'center',
  },
  heroTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'lowercase',
  },
  subRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButton: {
    background: '#E0E7FF',
    color: '#1E3A8A',
    border: '1px solid rgba(255,255,255,0.35)',
    padding: '8px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(17,24,39,0.25)',
    textTransform: 'lowercase',
  },
  walletCompact: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '8px 10px',
    borderRadius: 12,
  },
  dotConnected: { color: '#86EFAC', fontWeight: 900 },
  dotDisconnected: { color: '#FCA5A5', fontWeight: 900 },
  walletAddr: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '2px 6px',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 12,
  },
  pipe: { opacity: 0.6 },
  balanceText: { fontWeight: 700, color: '#EAF2FF' },
  connectButton: {
    marginLeft: 6,
    background: theme.secondary,
    color: '#111827',
    border: '1px solid transparent',
    padding: '6px 10px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
  },
  depositBlock: {
    width: '100%',
    maxWidth: 540,
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 14,
    padding: 12,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
  },
  inputLabel: {
    display: 'block',
    fontSize: 12,
    color: '#EAF2FF',
    fontWeight: 700,
    textAlign: 'left',
    marginBottom: 6,
    textTransform: 'none',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.35)',
    outline: 'none',
    fontSize: 14,
    color: '#0B1020',
    background: '#FFFFFF',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: '#DBEAFE',
    textAlign: 'left',
  },
  bannerError: {
    marginTop: 8,
    padding: '8px 10px',
    borderRadius: 10,
    background: '#FEF2F2',
    color: theme.error,
    border: `1px solid ${theme.error}33`,
    fontSize: 14,
  },
  bannerSuccess: {
    marginTop: 8,
    display: 'inline-flex',
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
  primaryButton: {
    background: theme.primary,
    color: '#ffffff',
    border: '1px solid transparent',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
    textTransform: 'none',
  },
  disabledBtn: {
    filter: 'grayscale(0.3)',
    opacity: 0.8,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  pendingWrap: {
    width: '100%',
    maxWidth: 720,
    textAlign: 'left',
    marginTop: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 10,
  },
  pendingHeader: {
    color: '#EAF2FF',
    fontWeight: 800,
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'lowercase',
    letterSpacing: 0.4,
  },
  pendingEmpty: {
    color: '#DBEAFE',
    fontSize: 13,
  },
  pendingList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  pendingItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  pendingText: {
    color: '#F8FAFC',
    fontWeight: 700,
  },
  pendingStatus: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: 700,
  },
};
