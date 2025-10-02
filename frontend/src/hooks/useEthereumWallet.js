import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ethers } from 'ethers';

/**
 * Ocean Professional theme tokens (local use)
 */
const theme = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
};

// PUBLIC_INTERFACE
export function truncateAddress(addr) {
  /** Truncate an Ethereum address for display, e.g., 0x1234...abcd */
  if (!addr || typeof addr !== 'string') return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// PUBLIC_INTERFACE
export function useEthereumWallet() {
  /**
   * React hook managing Ethereum wallet connection using ethers.js.
   * Provides connect, disconnect, status, address, and signer/provider.
   */
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const providerRef = useRef(null);
  const signerRef = useRef(null);

  const isConnected = !!address;

  const detectProvider = useCallback(() => {
    const { ethereum } = window;
    return ethereum || null;
  }, []);

  const refreshSigner = useCallback(async () => {
    const eth = detectProvider();
    if (!eth) return;
    const web3Provider = new ethers.providers.Web3Provider(eth, 'any');
    providerRef.current = web3Provider;
    signerRef.current = web3Provider.getSigner();
  }, [detectProvider]);

  const readAccounts = useCallback(async () => {
    try {
      const eth = detectProvider();
      if (!eth) return;
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        // If accounts are present, update to the checksummed first account.
        setAddress(ethers.utils.getAddress(accounts[0]));
      } else {
        // Important behavior:
        // Do NOT clear the address here. Some wallet providers momentarily return an empty array
        // during initialization or page load, which could cause UI to flicker to "disconnected".
        // We only clear the address on:
        //  - explicit disconnect() calls, or
        //  - accountsChanged events that indicate a true disconnect (empty list).
        // This avoids race/timing issues in tests and in real usage.
        // setAddress('');  // intentionally not clearing here
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read accounts', e);
    }
  }, [detectProvider]);

  const readChain = useCallback(async () => {
    try {
      const eth = detectProvider();
      if (!eth) return;
      const id = await eth.request({ method: 'eth_chainId' });
      setChainId(id);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read chainId', e);
    }
  }, [detectProvider]);

  // PUBLIC_INTERFACE
  const connect = useCallback(async () => {
    /** Prompt user to connect wallet via MetaMask or compatible provider. */
    setError('');
    setConnecting(true);
    try {
      const eth = detectProvider();
      if (!eth) {
        setError('No Ethereum wallet detected. Please install MetaMask.');
        return;
      }
      await refreshSigner();
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAddress(ethers.utils.getAddress(accounts[0]));
      }
      const id = await eth.request({ method: 'eth_chainId' });
      setChainId(id);
    } catch (e) {
      if (e?.code === 4001) {
        // User rejected request
        setError('Connection request rejected.');
      } else {
        setError(e?.message || 'Failed to connect wallet.');
      }
    } finally {
      setConnecting(false);
    }
  }, [detectProvider, refreshSigner]);

  // PUBLIC_INTERFACE
  const disconnect = useCallback(() => {
    /** Soft disconnect (clear local state). Most wallets don't support programmatic disconnect. */
    setAddress('');
    setChainId('');
    setError('');
    providerRef.current = null;
    signerRef.current = null;
  }, []);

  // Listen to account and network changes
  useEffect(() => {
    const eth = detectProvider();
    if (!eth) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts && accounts.length > 0) {
        setAddress(ethers.utils.getAddress(accounts[0]));
      } else {
        // True disconnect detected via accountsChanged -> clear address.
        setAddress('');
      }
    };
    const handleChainChanged = (id) => {
      setChainId(id);
    };

    eth.on?.('accountsChanged', handleAccountsChanged);
    eth.on?.('chainChanged', handleChainChanged);

    // Init read
    (async () => {
      await refreshSigner();
      await readAccounts();
      await readChain();
    })();

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
      eth.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [detectProvider, readAccounts, readChain, refreshSigner]);

  const provider = providerRef.current || null;
  const signer = signerRef.current || null;

  return {
    address,
    chainId,
    isConnected,
    connecting,
    error,
    connect,
    disconnect,
    provider,
    signer,
    theme, // exported for convenience in wallet UI
  };
}
