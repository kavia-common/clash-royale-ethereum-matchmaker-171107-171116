import React, { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useEthereumWallet, truncateAddress } from '../hooks/useEthereumWallet';
import { BlockchainClient, getExplorerTxUrl, isDryRun } from '../services/blockchain';
import apiClient, { apiGetLiveWagers } from '../services/api';
import { Banner, Skeleton } from './ui';

/**
 * Ocean Professional theme tokens for the unified escrow/deposits panel mapped to CSS variables
 */
const theme = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  background: 'var(--bg)',
  surface: 'var(--surface)',
  text: 'var(--text)',
  muted: 'var(--muted, #E0E7FF)',
  border: 'var(--border, #3B82F6)',
};

/**
 * PUBLIC_INTERFACE
 * DepositsDashboard
 * A unified panel:
 * - Wallet + network info
 * - Escrow deposit + withdraw/cancel actions (safe no-op in dry run)
 * - Pending deposits list with status and explorer links
 * - Live wagers table from api.js
 */
export default function DepositsDashboard({ pendingRequests, onDeposit, onWithdraw, wagerId }) {
  /** This is a public function. */
  const { isConnected, address, connect, signer, chainId } = useEthereumWallet();

  // Wallet/escrow balance
  const [balanceEth, setBalanceEth] = useState('');
  const [balanceError, setBalanceError] = useState('');

  // Deposit state
  const [amount, setAmount] = useState('0.10');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [lastTx, setLastTx] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [networkWarning, setNetworkWarning] = useState('');

  // Withdraw/cancel
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawOk, setWithdrawOk] = useState(false);

  // Live wagers
  const [live, setLive] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState('');

  // Pending list (fallback mock)
  const mocked = useMemo(
    () => ([
      { id: 'req-101', opponent: 'AquaKnight', amountEth: 0.25, status: 'awaiting-opponent', txHash: '' },
      { id: 'req-102', opponent: 'StormRider', amountEth: 0.75, status: 'pending', txHash: '' },
    ]),
    []
  );
  const items = Array.isArray(pendingRequests) ? pendingRequests : mocked;

  // Escrow config
  const [escrowConfig, setEscrowConfigLocal] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await apiClient.getEscrowConfig();
        if (!cancelled) setEscrowConfigLocal(cfg || null);
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Network warning
  useEffect(() => {
    if (!escrowConfig?.chainId || !chainId) {
      setNetworkWarning('');
      return;
    }
    const exp = normalizeChainId(escrowConfig.chainId);
    const cur = normalizeChainId(chainId);
    setNetworkWarning(exp && cur && exp !== cur ? 'Wrong network selected.' : '');
  }, [escrowConfig, chainId]);

  // Wallet balance
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
    return () => { canceled = true; };
  }, [isConnected, signer, address]);

  // Live wagers fetch
  const refreshLive = async () => {
    setLiveLoading(true);
    setLiveError('');
    try {
      const data = await apiGetLiveWagers();
      setLive(Array.isArray(data) ? data : []);
    } catch (e) {
      setLiveError(e?.message || 'Failed to load live wagers');
    } finally {
      setLiveLoading(false);
    }
  };
  useEffect(() => {
    refreshLive();
  }, []);

  const canDeposit = useMemo(() => {
    const n = Number(amount);
    return isConnected && signer && Number.isFinite(n) && n > 0;
  }, [isConnected, signer, amount]);

  const handleDeposit = async () => {
    setSendError('');
    setSending(true);
    setLastTx('');
    setExplorerUrl('');
    try {
      if (typeof onDeposit === 'function') {
        const res = await onDeposit({ amountEth: Number(amount) });
        setLastTx(res?.txHash || '');
        if (res?.txHash) setExplorerUrl(getExplorerTxUrl(res.txHash) || '');
      } else if (wagerId != null && signer) {
        const client = new BlockchainClient({
          signer,
          escrowAddress: escrowConfig?.address,
          escrowAbi: escrowConfig?.abi || undefined,
        });

        const expected = normalizeChainId(escrowConfig?.chainId || process.env.REACT_APP_CHAIN_ID);
        const current = normalizeChainId(chainId);
        if (expected && current && expected !== current) {
          setSendError('Wrong network selected. Please switch and try again.');
          return;
        }

        const { txHash, receipt } = await client.deposit({
          wagerId,
          amountEth: Number(amount),
        });
        const hash = txHash || receipt?.transactionHash || '';
        setLastTx(hash);
        const url = client.formatTxLink(hash);
        if (url) setExplorerUrl(url);
        try {
          await apiClient.depositNotify({ id: wagerId, txHash: hash, amountEth: Number(amount) });
        } catch {
          // non-fatal
        }
      } else {
        // Dry-run or generic mock
        await new Promise((r) => setTimeout(r, 800));
        const mockHash = `0x${Math.random().toString(16).slice(2).padEnd(64, '0').slice(0, 64)}`;
        setLastTx(mockHash);
        setExplorerUrl(getExplorerTxUrl(mockHash) || '');
      }
      // After deposit, refresh live wagers
      refreshLive();
    } catch (e) {
      const msg = e?.message || '';
      if (/user denied|user rejected|denied|rejected/i.test(msg)) {
        setSendError('Transaction rejected by user.');
      } else if (/insufficient funds|out of gas|gas required/i.test(msg)) {
        setSendError('Insufficient funds or gas.');
      } else {
        setSendError(msg || 'Deposit failed or was rejected.');
      }
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
        // Safe no-op/dry-run
        await new Promise((r) => setTimeout(r, 700));
        setWithdrawOk(true);
      }
    } catch (e) {
      setWithdrawError(e?.message || 'Withdraw failed or was rejected.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Mock USD est for display
  const mockUsdBalance = useMemo(() => {
    const eth = Number(balanceEth || 0);
    const usdPerEth = 3000;
    const usd = eth > 0 ? eth * usdPerEth : 125.0;
    return usd.toFixed(2);
  }, [balanceEth]);

  return (
    <section aria-label="Unified escrow and deposits panel" style={styles.wrapper}>
      <div style={styles.oceanPanel}>
        <div style={styles.centerWrap}>
          <h1 style={styles.heroTitle}>deposit in crypto</h1>

          {/* Wallet + balance row */}
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
          {networkWarning && <Banner type="warning">{networkWarning}</Banner>}
          {balanceError && <Banner type="error">{balanceError}</Banner>}

          {/* Deposit */}
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
            {sendError && <Banner type="error">{sendError}</Banner>}
            {lastTx && (
              <Banner type="success">
                <span aria-hidden="true">✅</span>&nbsp;Submitted. Tx:&nbsp;
                <code style={styles.txHash}>{lastTx.slice(0, 22)}…</code>
                {explorerUrl ? (
                  <> <a href={explorerUrl} target="_blank" rel="noreferrer" style={{ color: '#065F46', fontWeight: 800 }}>View on Explorer</a></>
                ) : null}
              </Banner>
            )}
          </div>

          {/* Withdraw/cancel (safe no-op when dry-run) */}
          <div style={styles.withdrawPanel} aria-label="Withdraw panel">
            <div style={styles.withdrawHeader}>
              <h2 style={styles.withdrawTitle}>withdraw</h2>
              <span style={styles.withdrawBadge}>{isDryRun() ? 'dry-run' : 'escrow'}</span>
            </div>
            <div style={styles.withdrawGrid}>
              <div style={styles.withdrawStat}>
                <div style={styles.withdrawLabel}>Current Balance</div>
                <div style={styles.withdrawValue}>
                  {balanceEth !== '' ? `${Number(balanceEth).toFixed(4)} ETH` : '—'}
                </div>
                <div style={styles.withdrawSub}>≈ ${mockUsdBalance} USD</div>
              </div>
              <div style={styles.withdrawStat}>
                <div style={styles.withdrawLabel}>Minimum Withdrawal</div>
                <div style={styles.withdrawValue}>$10</div>
                <div style={styles.withdrawSub}>Network fees apply</div>
              </div>
              <div style={styles.withdrawAction}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    aria-disabled={withdrawing}
                    style={{
                      ...styles.withdrawCta,
                      ...(withdrawing ? styles.disabledBtn : {}),
                    }}
                  >
                    {withdrawing ? 'Processing…' : 'Initiate Withdraw'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      // Safe cancel no-op in dry-run
                      setWithdrawError('');
                      try {
                        await new Promise((r) => setTimeout(r, 400));
                        setWithdrawOk(true);
                      } catch (e) {
                        setWithdrawError(e?.message || 'Cancel failed');
                      }
                    }}
                    style={{ ...styles.withdrawCta, background: '#F59E0B', borderColor: '#F59E0B', color: '#111827' }}
                    aria-label="Cancel pending escrow"
                    title="Cancel pending escrow"
                  >
                    Cancel
                  </button>
                </div>
                {withdrawError && <Banner type="error">{withdrawError}</Banner>}
                {withdrawOk && <Banner type="success">Action completed</Banner>}
              </div>
            </div>
          </div>

          {/* Pending escrows */}
          <div style={styles.pendingWrap}>
            <div style={styles.pendingHeader}>pending escrows</div>
            {(!items || items.length === 0) ? (
              <div style={styles.pendingEmpty}>
                <span aria-hidden="true">🌊</span>&nbsp;No pending requests
              </div>
            ) : (
              <ul style={styles.pendingList} aria-label="Pending deposit requests">
                {items.map((r) => {
                  const link = r.txHash ? getExplorerTxUrl(r.txHash) : '';
                  return (
                    <li key={r.id} style={styles.pendingItem}>
                      <span style={styles.pendingText}>
                        {r.opponent || 'Unknown'} · {Number(r.amountEth).toFixed(2)} ETH
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={styles.pendingStatus}>{labelForStatus(r.status)}</span>
                        {link ? (
                          <a href={link} target="_blank" rel="noreferrer" style={{ color: '#DBEAFE', fontSize: 12, textDecoration: 'underline' }}>
                            view tx
                          </a>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Live wagers list */}
          <div style={styles.liveWrap}>
            <div style={styles.liveHeader}>
              <h3 style={styles.liveTitle}>live wagers</h3>
              <button type="button" onClick={refreshLive} style={styles.refreshBtn} aria-label="Refresh live wagers">
                Refresh
              </button>
            </div>
            {liveLoading ? (
              <div style={{ padding: 8 }}>
                <Skeleton variant="text" count={3} />
              </div>
            ) : liveError ? (
              <Banner type="error">{liveError}</Banner>
            ) : (!live || live.length === 0) ? (
              <div style={styles.liveEmpty}>No live wagers</div>
            ) : (
              <ul style={styles.liveList} aria-label="Live wagers">
                {live.map((w) => (
                  <li key={w.id} style={styles.liveItem}>
                    <div style={styles.liveRow}>
                      <span style={styles.liveId}>#{w.id}</span>
                      <span style={styles.liveStatus}>{String(w.status || '').replace(/-/g, ' ')}</span>
                      <span style={styles.liveAmounts}>
                        {Number(w?.amounts?.challengerEth || 0).toFixed(2)} + {Number(w?.amounts?.opponentEth || 0).toFixed(2)} ETH
                      </span>
                    </div>
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
  wrapper: { width: '100%' },
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
  },
  inputRow: { display: 'flex', gap: 8 },
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
  hint: { marginTop: 6, fontSize: 12, color: '#DBEAFE', textAlign: 'left' },
  txHash: {
    background: '#111827',
    color: '#F9FAFB',
    padding: '2px 6px',
    borderRadius: 6,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
  },
  disabledBtn: { filter: 'grayscale(0.3)', opacity: 0.8, cursor: 'not-allowed', boxShadow: 'none' },

  // Pending list
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
  pendingEmpty: { color: '#DBEAFE', fontSize: 13 },
  pendingList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  pendingItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  pendingText: { color: '#F8FAFC', fontWeight: 700 },
  pendingStatus: { color: '#DBEAFE', fontSize: 12, fontWeight: 700 },

  // Withdraw panel
  withdrawPanel: {
    width: '100%',
    maxWidth: 720,
    marginTop: 12,
    background: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: 14,
    padding: 12,
    boxShadow: '0 8px 18px rgba(16,185,129,0.20)',
  },
  withdrawHeader: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  withdrawTitle: { margin: 0, fontSize: 18, fontWeight: 900, color: '#065F46', textTransform: 'lowercase', letterSpacing: 0.3 },
  withdrawBadge: { fontSize: 12, fontWeight: 800, color: '#065F46', background: '#D1FAE5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 999 },
  withdrawGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'stretch' },
  withdrawStat: { background: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: 12, padding: 12, textAlign: 'left' },
  withdrawLabel: { fontSize: 12, color: '#047857', fontWeight: 800 },
  withdrawValue: { fontSize: 18, fontWeight: 900, color: '#065F46' },
  withdrawSub: { fontSize: 12, color: '#047857' },
  withdrawAction: { gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: 12, padding: 12 },
  withdrawCta: { background: '#10B981', color: '#ffffff', border: '1px solid #10B981', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 12px rgba(16,185,129,0.35)' },

  // Live wagers
  liveWrap: {
    width: '100%',
    maxWidth: 720,
    textAlign: 'left',
    marginTop: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 10,
  },
  liveHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  liveTitle: { margin: 0, fontSize: 14, fontWeight: 900, color: '#EAF2FF', letterSpacing: 0.3, textTransform: 'uppercase' },
  refreshBtn: { background: '#FFFFFF', color: '#111827', border: '1px solid #E5E7EB', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 700 },
  liveEmpty: { color: '#DBEAFE', fontSize: 13 },
  liveList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  liveItem: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 10px' },
  liveRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#F8FAFC' },
  liveId: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontWeight: 700 },
  liveStatus: { fontSize: 12, color: '#DBEAFE', fontWeight: 700, textTransform: 'capitalize' },
  liveAmounts: { fontWeight: 800 },
};

function normalizeChainId(id) {
  if (!id) return '';
  const s = String(id);
  if (s.startsWith('0x')) return String(parseInt(s, 16));
  return s;
}
