import React, { useMemo, useState } from 'react';
import { truncateAddress, useEthereumWallet } from '../hooks/useEthereumWallet';

/**
 * Ocean Professional theme tokens
 */
const theme = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  muted: '#6B7280',
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
  const { isConnected, address, connect, theme: walletTheme } = useEthereumWallet();
  const [wager, setWager] = useState(defaultWager || opponent?.wagerEth || 0.1);
  const [step, setStep] = useState('review'); // 'review' | 'confirm' | 'pending' | 'success' | 'failure'
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [gasEstimate, setGasEstimate] = useState('~0.00042');

  // Reset when modal reopens
  React.useEffect(() => {
    if (open) {
      setStep('review');
      setError('');
      setTxHash('');
      setWager(defaultWager || opponent?.wagerEth || 0.1);
    }
  }, [open, defaultWager, opponent]);

  const canProceed = useMemo(() => {
    if (!wager || Number.isNaN(Number(wager))) return false;
    if (Number(wager) <= 0) return false;
    return true;
  }, [wager]);

  const beginFlow = async () => {
    setError('');
    if (!canProceed) return;
    try {
      // Placeholder for backend call to create match intent
      if (typeof onInitiate === 'function') {
        await onInitiate({ opponentId: opponent?.id, wagerEth: Number(wager) });
      } else {
        await new Promise((r) => setTimeout(r, 300));
      }
      setStep('confirm');
    } catch (e) {
      setError(e?.message || 'Failed to initiate match. Please try again.');
    }
  };

  const confirmDeposit = async () => {
    setError('');
    setStep('pending');
    try {
      // Stubbed deposit action. Replace later with ethers.js call:
      // const tx = await signer.sendTransaction({ to: ESCROW_ADDRESS, value: ethers.utils.parseEther(wager) });
      // await tx.wait();
      // For now, simulate delay and a mock tx hash:
      if (typeof onDeposit === 'function') {
        const res = await onDeposit({ opponentId: opponent?.id, wagerEth: Number(wager) });
        setTxHash(res?.txHash || '0xmockedtx' + Math.random().toString(16).slice(2));
      } else {
        await new Promise((r) => setTimeout(r, 1500));
        setTxHash('0xmockedtx' + Math.random().toString(16).slice(2));
      }
      setStep('success');
      onComplete?.({ status: 'success', txHash });
    } catch (e) {
      setStep('failure');
      setError(e?.message || 'The transaction failed or was rejected.');
      onComplete?.({ status: 'failure' });
    }
  };

  const restart = () => {
    setStep('review');
    setError('');
    setTxHash('');
  };

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
            <div role="alert" style={styles.warning}>
              You must connect your Ethereum wallet to continue.
            </div>
          )}

          {error && (
            <div role="alert" style={styles.errorBanner}>
              {error}
            </div>
          )}

          <StateIndicator step={step} txHash={txHash} />

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

function StateIndicator({ step, txHash }) {
  if (step === 'pending') {
    return (
      <div style={styles.stateRow}>
        <Spinner />
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
            <code style={styles.txHash}>{txHash.slice(0, 18)}…</code>
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

function Spinner() {
  return (
    <div
      aria-label="Loading"
      role="status"
      style={styles.spinner}
    />
  );
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
  spinner: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '3px solid #BFDBFE',
    borderTopColor: theme.primary,
    animation: 'spin 1s linear infinite',
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

// Inject simple keyframes for spinner (scoped to component load)
const styleEl = document.createElement('style');
styleEl.innerHTML = `
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
`;
document.head.appendChild(styleEl);
