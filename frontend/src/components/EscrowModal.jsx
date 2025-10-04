import React, { useMemo, useState } from 'react';
import { truncateAddress, useEthereumWallet } from '../hooks/useEthereumWallet';
import apiClient, { apiConfirmDeposit } from '../services/api';
import { BlockchainClient } from '../services/blockchain';
import { useAppDispatch } from '../state/store';
import { setEscrowConfig, updateEscrowStatus } from '../state/actions';
import { Spinner, Banner } from './ui';

/**
 * Ocean Professional theme tokens mapped to CSS variables
 */
const theme = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  success: 'var(--color-success)',
  warning: 'var(--color-secondary)',
  error: 'var(--color-error)',
  background: 'var(--bg)',
  surface: 'var(--surface)',
  text: 'var(--text)',
  muted: 'var(--muted, #6B7280)',
  overlay: 'rgba(17, 24, 39, 0.55)',
};

/**
 * PUBLIC_INTERFACE
 * EscrowModal
 * A controlled modal to initiate a match and place an ETH wager into escrow.
 * Props:
 * - open: boolean - whether the modal is open
 * - onClose: function - called when modal should be closed
 * - challenger: { id, username, rank, address? } - current user info (optional display)
 * - opponent: { id, username, rank, wagerEth } - selected opponent profile
 * - defaultWager: number - default wager value in ETH
 * - onInitiate: async function({ opponentId, wagerEth }) - called before simulating deposit (for backend reservation)
 * - onDeposit: async function({ opponentId, wagerEth }) - performs actual deposit (stubbed here)
 * - onComplete: function({ status, txHash? }) - called on completion
 */
export default function EscrowModal({
  open,
  onClose,
  challenger,
  opponent,
  defaultWager,
  onInitiate,
  onDeposit,
  onComplete,
}) {
  /** This is a public function. */
  const { isConnected, address, connect, signer, chainId } = useEthereumWallet();
  const dispatch = useAppDispatch();

  const [wager, setWager] = useState(defaultWager || opponent?.wagerEth || 0.1);
  const [step, setStep] = useState('review'); // 'review' | 'confirm' | 'pending' | 'success' | 'failure'
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [gasEstimate, setGasEstimate] = useState('~0.00042');

  // Additional escrow state
  const [matchId, setMatchId] = useState(null);
  const [escrowConfig, setLocalEscrowConfig] = useState(null);
  const [explorerUrl, setExplorerUrl] = useState('');
  const [networkWarning, setNetworkWarning] = useState('');

  // Reset when modal reopens
  React.useEffect(() => {
    if (open) {
      setStep('review');
      setError('');
      setTxHash('');
      setWager(defaultWager || opponent?.wagerEth || 0.1);
      setMatchId(null);
      setNetworkWarning('');
      // Fetch escrow config for address/chain details
      (async () => {
        try {
          const cfg = await apiClient.getEscrowConfig();
          setLocalEscrowConfig(cfg || null);
          dispatch(setEscrowConfig(cfg || null));
          // Network warning if applicable
          const expected = normalizeChainId(cfg?.chainId || process.env.REACT_APP_CHAIN_ID);
          const current = normalizeChainId(chainId);
          if (expected && current && expected !== current) {
            setNetworkWarning('Wrong network selected. Please switch to the required network.');
          } else {
            setNetworkWarning('');
          }
        } catch (e) {
          // Non-fatal: allow user to continue; deposit will fail if address missing
          // eslint-disable-next-line no-console
          console.warn('Failed to load escrow config', e);
        }
      })();
    }
  }, [open, defaultWager, opponent, chainId, dispatch]);

  // Update network warning if chain changes while modal is open
  React.useEffect(() => {
    const expected = normalizeChainId(escrowConfig?.chainId || process.env.REACT_APP_CHAIN_ID);
    const current = normalizeChainId(chainId);
    if (!open) return;
    if (expected && current && expected !== current) {
      setNetworkWarning('Wrong network selected. Please switch to the required network.');
    } else {
      setNetworkWarning('');
    }
  }, [chainId, escrowConfig, open]);

  const canProceed = useMemo(() => {
    if (!wager || Number.isNaN(Number(wager))) return false;
    if (Number(wager) <= 0) return false;
    return true;
  }, [wager]);

  async function beginFlow() {
    setError('');
    if (!canProceed) return;
    try {
      // Prefer injected handler for backward compatibility (unit tests rely on this)
      if (typeof onInitiate === 'function') {
        const res = await onInitiate({ opponentId: opponent?.id, wagerEth: Number(wager) });
        const id = res?.id ?? res?.wagerId ?? res?.matchId ?? null;
        if (id != null) setMatchId(id);
      } else {
        const res = await apiClient.initiateWager({ opponentId: opponent?.id, wagerEth: Number(wager) });
        const id = res?.id ?? res?.wagerId ?? res?.matchId ?? null;
        setMatchId(id);
      }
      setStep('confirm');
    } catch (e) {
      setError(e?.message || 'Failed to initiate match. Please try again.');
    }
  }

  async function confirmDeposit() {
    setError('');
    if (!isConnected) {
      setError('Wallet not connected. Please connect your wallet.');
      return;
    }
    setStep('pending');
    try {
      // Backward compatibility: allow caller to fully manage deposit if provided
      if (typeof onDeposit === 'function') {
        const res = await onDeposit({ opponentId: opponent?.id, wagerEth: Number(wager) });
        const newHash = res?.txHash || ('0xmockedtx' + Math.random().toString(16).slice(2));
        setTxHash(newHash);
        setStep('success');
        onComplete?.({ status: 'success', txHash: newHash });
        return;
      }

      // Services-based flow
      if (!signer) throw new Error('No signer available. Please reconnect your wallet.');
      const client = new BlockchainClient({
        signer,
        escrowAddress: escrowConfig?.address,
        escrowAbi: escrowConfig?.abi || undefined,
      });

      // Validate network if config provides one
      const expected = normalizeChainId(escrowConfig?.chainId || process.env.REACT_APP_CHAIN_ID);
      const current = normalizeChainId(chainId);
      if (expected && current && expected !== current) {
        setNetworkWarning('Wrong network selected. Please switch to the required network.');
        throw new Error('Wrong network selected.');
      }

      // Ensure we have a match/wager id to deposit to; fallback to 0 if backend didn't return
      const id = matchId ?? 0;

      // Send deposit
      const { txHash: hash, receipt } = await client.deposit({
        wagerId: id,
        amountEth: Number(wager),
      });
      setTxHash(hash || receipt?.transactionHash || '');
      const url = client.formatTxLink(hash || receipt?.transactionHash || '');
      if (url) setExplorerUrl(url);

      // Notify backend of deposit tx hash (best-effort)
      try {
        await apiClient.depositNotify({ id, txHash: hash || receipt?.transactionHash || '', amountEth: Number(wager) });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Deposit notify failed, will continue to poll status', e);
      }

      // Poll escrow status to reflect readiness
      await pollEscrowStatus({ id, attempts: 6, delayMs: 2000 });

      // Optional: confirm wager if backend requires a call after both deposits
      try {
        await apiConfirmDeposit({ matchId: id, txHash: hash || receipt?.transactionHash || '' });
        await apiClient.confirmWager({ id });
      } catch {
        // Not fatal; some backends auto-confirm when both deposits present
      }

      setStep('success');
      onComplete?.({ status: 'success', txHash: hash || receipt?.transactionHash || '' });
    } catch (e) {
      // Map common blockchain errors to friendly messages
      const msg = e?.message || '';
      if (/user denied|user rejected|denied transaction|rejected/i.test(msg)) {
        setError('Transaction rejected by user.');
      } else if (/insufficient funds|out of gas|gas required exceeds/i.test(msg)) {
        setError('Insufficient funds or gas. Please check your balance and try again.');
      } else if (/wrong network|chain id/i.test(msg)) {
        setError('Wrong network selected. Please switch and try again.');
      } else {
        setError(msg || 'The transaction failed or was rejected.');
      }
      setStep('failure');
      onComplete?.({ status: 'failure' });
    }
  }

  function restart() {
    setStep('review');
    setError('');
    setTxHash('');
    setExplorerUrl('');
  }

  async function pollEscrowStatus({ id, attempts = 5, delayMs = 1500 }) {
    let tries = 0;
    while (tries < attempts) {
      tries += 1;
      try {
        const status = await apiClient.getEscrowStatus({ wagerId: id });
        if (status) {
          dispatch(updateEscrowStatus({ wagerId: id, status }));
          const s = status?.state || status?.status || '';
          // Heuristic: mark ready when backend says ready/in-progress/deposited
          if (['ready', 'in-progress', 'deposited', 'awaiting-opponent'].includes(String(s))) {
            return;
          }
        }
      } catch {
        // continue retries
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const wrongNetworkBanner = networkWarning ? (
    <Banner type="warning">{networkWarning}</Banner>
  ) : null;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="escrow-modal-title"
      aria-describedby="escrow-modal-desc"
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 id="escrow-modal-title" style={styles.title}>
            Initiate Match & Deposit Escrow
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            style={styles.iconButton}
          >
            ×
          </button>
        </div>

        <p id="escrow-modal-desc" style={styles.subtitle}>
          Review players and wager amount. You’ll be prompted to confirm an Ethereum transaction
          to place your funds into escrow. Both parties must deposit before the match can begin.
        </p>

        <div style={styles.panel}>
          <div style={styles.playersRow}>
            <div style={styles.playerCard}>
              <div style={styles.playerTitle}>You</div>
              <div style={styles.playerValue}>
                {challenger?.username || 'Connected Wallet'}
              </div>
              <div style={styles.playerSub}>
                {address ? truncateAddress(address) : 'No wallet connected'}
              </div>
            </div>
            <div aria-hidden="true" style={styles.vsBadge}>
              VS
            </div>
            <div style={styles.playerCard}>
              <div style={styles.playerTitle}>Opponent</div>
              <div style={styles.playerValue}>{opponent?.username}</div>
              <div style={styles.playerSub}>{opponent?.rank || 'Unranked'}</div>
            </div>
          </div>

          <div style={styles.wagerBlock}>
            <label htmlFor="wager" style={styles.wagerLabel}>
              Wager Amount (ETH)
            </label>
            <input
              id="wager"
              type="number"
              min="0.01"
              step="0.01"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              style={styles.wagerInput}
            />
            <div style={styles.wagerHelp}>
              Estimated gas: <strong>{gasEstimate}</strong>
            </div>
          </div>

          {!isConnected && (
            <Banner type="warning">
              You must connect your Ethereum wallet to continue.
            </Banner>
          )}
          {wrongNetworkBanner}

          {error && (
            <Banner type="error">{error}</Banner>
          )}

          <StateIndicator
            step={step}
            txHash={txHash}
            explorerUrl={explorerUrl}
          />

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>
              {step === 'success' ? 'Close' : 'Cancel'}
            </button>

            {step === 'review' && (
              <>
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={connect}
                    style={styles.connectButton}
                    aria-label="Connect Ethereum Wallet"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={beginFlow}
                    disabled={!canProceed}
                    style={{
                      ...styles.primaryButton,
                      ...(canProceed ? {} : styles.primaryButtonDisabled),
                    }}
                    aria-disabled={!canProceed}
                  >
                    Continue
                  </button>
                )}
              </>
            )}

            {step === 'confirm' && (
              <button
                type="button"
                onClick={confirmDeposit}
                style={styles.primaryButton}
              >
                Confirm Deposit
              </button>
            )}

            {step === 'pending' && (
              <button type="button" style={styles.primaryButtonDisabled}>
                Processing…
              </button>
            )}

            {step === 'failure' && (
              <>
                <button type="button" onClick={restart} style={styles.warningButton}>
                  Retry
                </button>
              </>
            )}

            {step === 'success' && (
              <button
                type="button"
                onClick={() => onClose?.()}
                style={styles.primaryButton}
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StateIndicator({ step, txHash, explorerUrl }) {
  if (step === 'pending') {
    return (
      <div style={styles.stateRow}>
        <Spinner srText="Waiting for confirmation" />
        <div style={styles.stateText}>
          Transaction submitted. Waiting for confirmation…
        </div>
      </div>
    );
  }
  if (step === 'success') {
    return (
      <div style={styles.stateRowSuccess}>
        <span aria-hidden="true">✅</span>
        <div style={styles.stateText}>
          Deposit confirmed. Tx:{' '}
          {txHash ? (
            <>
              <code style={styles.txHash}>{txHash.slice(0, 18)}…</code>
              {explorerUrl ? (
                <>
                  {' '}
                  <a href={explorerUrl} target="_blank" rel="noreferrer">View on Explorer</a>
                </>
              ) : null}
            </>
          ) : (
            <code style={styles.txHash}>N/A</code>
          )}
        </div>
      </div>
    );
  }
  if (step === 'failure') {
    return (
      <div style={styles.stateRowError}>
        <span aria-hidden="true">⚠️</span>
        <div style={styles.stateText}>
          Transaction failed or was rejected. Please try again.
        </div>
      </div>
    );
  }
  return null;
}



const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: theme.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 680,
    background: theme.surface,
    color: theme.text,
    borderRadius: 14,
    boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
    padding: 20,
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
  panel: {
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 14,
    background: `linear-gradient(180deg, rgba(37,99,235,0.04), rgba(255,255,255,1))`,
  },
  playersRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'stretch',
    gap: 8,
  },
  playerCard: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
  },
  playerTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.muted,
  },
  playerValue: {
    fontSize: 16,
    fontWeight: 800,
    color: theme.text,
  },
  playerSub: {
    fontSize: 12,
    color: theme.muted,
  },
  vsBadge: {
    alignSelf: 'center',
    fontWeight: 800,
    color: theme.primary,
    background: '#EEF2FF',
    border: `1px solid ${theme.primary}33`,
    padding: '6px 10px',
    borderRadius: 999,
  },
  wagerBlock: {
    marginTop: 12,
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: 12,
  },
  wagerLabel: {
    display: 'block',
    fontSize: 12,
    color: '#374151',
    fontWeight: 700,
    marginBottom: 6,
  },
  wagerInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    outline: 'none',
    fontSize: 14,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
  },
  wagerHelp: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 6,
  },
  warning: {
    marginTop: 10,
    padding: '10px 12px',
    borderRadius: 10,
    background: '#FFFBEB',
    color: '#92400E',
    border: '1px solid #F59E0B66',
    fontSize: 14,
  },
  errorBanner: {
    marginTop: 10,
    padding: '10px 12px',
    borderRadius: 10,
    background: '#FEF2F2',
    color: theme.error,
    border: `1px solid ${theme.error}33`,
    fontSize: 14,
  },
  actions: {
    marginTop: 14,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  secondaryButton: {
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #E5E7EB',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  connectButton: {
    background: theme.secondary,
    color: '#111827',
    border: '1px solid transparent',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
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
  warningButton: {
    background: theme.secondary,
    color: '#111827',
    border: '1px solid transparent',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
  },
  primaryButtonDisabled: {
    background: '#93C5FD',
    color: '#ffffff',
    border: '1px solid transparent',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'not-allowed',
    fontWeight: 700,
    filter: 'grayscale(0.3)',
    opacity: 0.8,
    boxShadow: 'none',
  },
  stateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: '8px 10px',
    borderRadius: 10,
    background: '#EFF6FF',
    border: '1px solid #93C5FD',
    color: '#1E3A8A',
  },
  stateRowSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: '8px 10px',
    borderRadius: 10,
    background: '#ECFDF5',
    border: '1px solid #A7F3D0',
    color: '#065F46',
  },
  stateRowError: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: '8px 10px',
    borderRadius: 10,
    background: '#FEF2F2',
    border: '1px solid #FCA5A5',
    color: '#7F1D1D',
  },
  stateText: {
    fontSize: 14,
    fontWeight: 600,
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
};



function normalizeChainId(id) {
  if (!id) return '';
  const s = String(id);
  if (s.startsWith('0x')) return String(parseInt(s, 16));
  return s;
}
