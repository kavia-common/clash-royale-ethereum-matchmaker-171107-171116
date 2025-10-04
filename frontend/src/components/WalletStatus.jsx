import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useEthereumWallet, truncateAddress } from '../hooks/useEthereumWallet';
import { useAppDispatch } from '../state/store';
import { setAuthWallet } from '../state/actions';
import apiClient from '../services/api';
import { useAppSelector } from '../state/store';
import { selectCrAccount } from '../state/selectors';
import { Banner } from './ui';

/**
 * WalletStatus
 * Displays connect/disconnect actions and status with Ocean Professional styling.
 * Provides SIWE-style verification to establish a session with the backend.
 */
// PUBLIC_INTERFACE
export default function WalletStatus() {
  /** This is a public function. */
  const dispatch = useAppDispatch();
  const {
    address,
    isConnected,
    connecting,
    error,
    connect,
    disconnect,
    theme,
    chainId,
    signer,
    provider,
    networkName,
  } = useEthereumWallet();

  // Local UI state to represent verification status and transient messages
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [localError, setLocalError] = useState('');
  const crAccount = useAppSelector(selectCrAccount);

  // Sync wallet state into global store's authSession slice (no-op if provider isn't mounted)
  useEffect(() => {
    dispatch(
      setAuthWallet({
        address,
        chainId,
        isConnected,
        connecting,
        error: error || localError,
        verified,
        networkName: networkName || '',
      })
    );
  }, [dispatch, address, chainId, isConnected, connecting, error, localError, verified, networkName]);

  // Reset verified state if address changes or disconnects
  useEffect(() => {
    if (!isConnected) {
      setVerified(false);
      setVerifying(false);
      setLocalError('');
    }
  }, [isConnected, address]);

  const domain = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    try {
      return window.location.host || 'localhost';
    } catch {
      return 'localhost';
    }
  }, []);

  const origin = useMemo(() => {
    if (typeof window === 'undefined') return 'http://localhost';
    try {
      return window.location.origin || 'http://localhost';
    } catch {
      return 'http://localhost';
    }
  }, []);

  // PUBLIC_INTERFACE
  const handleVerify = useCallback(async () => {
    /** Trigger SIWE-style flow: nonce -> sign -> verify */
    setLocalError('');
    if (!isConnected || !address) {
      setLocalError('Connect your wallet first.');
      return;
    }
    if (!signer) {
      setLocalError('No signer available. Please reconnect your wallet.');
      return;
    }
    setVerifying(true);
    try {
      const nonceResp = await apiClient.getWalletNonce(address);
      const nonce = nonceResp?.nonce || String(Math.floor(Math.random() * 1e9));

      // Compute decimal chain id (supports hex string like 0x1)
      let chainNumeric = '';
      if (chainId) {
        chainNumeric =
          typeof chainId === 'string' && chainId.startsWith('0x')
            ? String(parseInt(chainId, 16))
            : String(chainId);
      }

      const issuedAt = new Date().toISOString();
      // Minimal SIWE-like message. We keep it simple for signMessage but include the nonce and domain.
      const message = [
        'Sign-In With Ethereum',
        '',
        `Domain: ${domain}`,
        `Address: ${address}`,
        `Statement: Authenticate to CR Matchmaker`,
        `URI: ${origin}`,
        'Version: 1',
        chainNumeric ? `Chain ID: ${chainNumeric}` : undefined,
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
      ]
        .filter(Boolean)
        .join('\n');

      // Sign with the current signer
      const signature = await signer.signMessage(message);

      // Verify via backend (assumed cookie-based session)
      const res = await apiClient.verifyWalletSignature({ address, signature });
      if (res?.ok || res?.user) {
        setVerified(true);
      } else {
        setLocalError('Verification failed. Please try again.');
      }
    } catch (e) {
      const msg = e?.message || 'Verification failed.';
      // Map some common issues to friendly messages
      if (msg.toLowerCase().includes('user denied') || msg.toLowerCase().includes('rejected')) {
        setLocalError('Signature was rejected.');
      } else {
        setLocalError(msg);
      }
    } finally {
      setVerifying(false);
    }
  }, [address, chainId, domain, origin, isConnected, signer]);

  const wrongNetworkHint = useMemo(() => {
    const expected = process.env.REACT_APP_CHAIN_ID;
    if (!expected || !chainId) return '';
    const normalize = (v) => {
      if (typeof v === 'string' && v.startsWith('0x')) return String(parseInt(v, 16));
      return String(v);
    };
    return normalize(expected) !== normalize(chainId) ? 'Wrong network selected.' : '';
  }, [chainId]);

  const connectDisabled = connecting;
  const verifyDisabled = verifying || !isConnected || verified;

  return (
    <div style={styles.container(theme)} aria-live="polite">
      <div style={styles.statusRow}>
        {isConnected ? (
          <span style={styles.connectedBadge(theme)} title={address}>
            ● Connected{verified ? ' · Verified' : ' · Unverified'}{crAccount ? ' · Linked' : ''}
          </span>
        ) : (
          <span style={styles.disconnectedBadge}>○ Disconnected</span>
        )}
        {/* Always render the wallet-address span for deterministic tests */}
        <span style={styles.address(theme)} data-testid="wallet-address">
          {isConnected && address ? truncateAddress(address) : ''}
        </span>
        {networkName ? (
          <span aria-label="network name" style={{ color: '#6B7280', fontSize: 12 }}>
            {networkName}
          </span>
        ) : null}
      </div>

      {(error || localError || wrongNetworkHint) && (
        <div style={{ minWidth: 0 }}>
          {/* Use reusable Banner; type 'error' enforces role='alert' */}
          <span style={{ display: 'inline-block' }}>
            {/*
              We avoid importing heavy CSS; inline style + Banner provides consistent UI.
              Wrapping in span keeps layout impact minimal next to buttons.
            */}
            <Banner type="error">
              {error || localError || wrongNetworkHint}
            </Banner>
          </span>
        </div>
      )}

      <div style={styles.actions}>
        {!isConnected ? (
          <button
            type="button"
            onClick={connect}
            disabled={connectDisabled}
            style={{
              ...styles.primaryButton(theme),
              ...(connectDisabled ? styles.buttonDisabled : {}),
            }}
            aria-label="Connect Ethereum Wallet"
          >
            Connect Ethereum Wallet
          </button>
        ) : (
          <>
            {!verified && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyDisabled}
                style={{
                  ...styles.secondaryButton,
                  ...(verifyDisabled ? styles.buttonDisabled : {}),
                }}
                aria-label="Verify Wallet Signature"
                title="Verify to establish a session"
              >
                Verify
              </button>
            )}
            <button
              type="button"
              onClick={disconnect}
              style={styles.secondaryButton}
              aria-label="Disconnect Ethereum Wallet"
            >
              Disconnect Ethereum Wallet
            </button>
          </>
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
