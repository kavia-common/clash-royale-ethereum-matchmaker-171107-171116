import React from 'react';
import { useEthereumWallet, truncateAddress } from '../hooks/useEthereumWallet';

/**
 * WalletStatus
 * Displays connect/disconnect actions and status with Ocean Professional styling.
 */
// PUBLIC_INTERFACE
export default function WalletStatus() {
  /** This is a public function. */
  const {
    address,
    isConnected,
    connecting,
    error,
    connect,
    disconnect,
    theme,
  } = useEthereumWallet();

  return (
    <div style={styles.container(theme)} aria-live="polite">
      <div style={styles.statusRow}>
        {isConnected ? (
          <span style={styles.connectedBadge(theme)} title={address}>
            ● Connected
          </span>
        ) : (
          <span style={styles.disconnectedBadge}>○ Disconnected</span>
        )}
        {/* Always render the wallet-address span for deterministic tests */}
        <span style={styles.address(theme)} data-testid="wallet-address">
          {isConnected && address ? truncateAddress(address) : ''}
        </span>
      </div>

      {error && (
        <div role="alert" style={styles.error(theme)}>
          {error}
        </div>
      )}

      <div style={styles.actions}>
        {!isConnected ? (
          <button
            onClick={connect}
            disabled={connecting}
            style={{
              ...styles.primaryButton(theme),
              ...(connecting ? styles.buttonDisabled : {}),
            }}
            aria-busy={connecting}
            aria-label="Connect Ethereum Wallet"
          >
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        ) : (
          <button
            onClick={disconnect}
            style={styles.secondaryButton}
            aria-label="Disconnect Ethereum Wallet"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#ffffff',
    border: '1px solid #E5E7EB',
    padding: '8px 10px',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    color: theme.text,
  }),
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 140,
  },
  connectedBadge: (theme) => ({
    display: 'inline-block',
    color: theme.primary,
    fontWeight: 700,
    fontSize: 12,
  }),
  disconnectedBadge: {
    display: 'inline-block',
    color: '#6B7280',
    fontWeight: 600,
    fontSize: 12,
  },
  address: (theme) => ({
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    background: '#F3F4F6',
    border: '1px solid #E5E7EB',
    color: theme.text,
    padding: '4px 8px',
    borderRadius: 8,
    fontSize: 12,
  }),
  error: (theme) => ({
    color: theme.error,
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 8,
    background: '#FEF2F2',
    border: `1px solid ${theme.error}33`,
  }),
  actions: {
    display: 'flex',
    gap: 8,
    marginLeft: 'auto',
  },
  primaryButton: (theme) => ({
    background: theme.primary,
    color: '#ffffff',
    border: '1px solid transparent',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
    transition: 'transform 0.1s ease, filter 0.2s ease',
  }),
  secondaryButton: {
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #E5E7EB',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  buttonDisabled: {
    filter: 'grayscale(0.3)',
    opacity: 0.7,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};
