import { useCallback, useEffect, useRef, useState } from 'react';
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
   *
   * Test stability and UX improvements:
   * - Avoid clearing address on eth_accounts returning [] during init; only clear on explicit disconnect or accountsChanged -> [].
   * - Ensure address is set immediately after connect resolves.
   * - Initialize provider/signer once per mount and refresh on demand.
   */
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const initRan = useRef(false);

  const isConnected = !!address;

  const detectProvider = useCallback(() => {
    // Guard for test environments where window might be undefined
    if (typeof window === 'undefined') return null;
    const { ethereum } = window;
    return ethereum || null;
  }, []);

  const ensureProvider = useCallback(() => {
    const eth = detectProvider();
    if (!eth) return null;
    if (!providerRef.current) {
      const web3Provider = new ethers.providers.Web3Provider(eth, 'any');
      providerRef.current = web3Provider;
      signerRef.current = web3Provider.getSigner();
    }
    return providerRef.current;
  }, [detectProvider]);

  const readAccounts = useCallback(async () => {
    try {
      const eth = detectProvider();
      if (!eth) return;
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        setAddress(ethers.utils.getAddress(accounts[0]));
      } else {
        // Intentionally avoid clearing address here to prevent flicker/flaky tests.
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
      ensureProvider();
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        // Set address immediately to avoid any intermediate clearing.
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
  }, [detectProvider, ensureProvider]);

  // PUBLIC_INTERFACE
  const disconnect = useCallback(() => {
    /** Soft disconnect (clear local state). Most wallets don't support programmatic disconnect. */
    setAddress('');
    setChainId('');
    setError('');
    providerRef.current = null;
    signerRef.current = null;
  }, []);

  // Listen to account and network changes and run initial reads exactly once per mount
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

    // One-time initialization per mount to prevent multiple act() updates
    if (!initRan.current) {
      initRan.current = true;
      ensureProvider();
      // Schedule initial reads in microtasks to batch state updates
      Promise.resolve()
        .then(readAccounts)
        .then(readChain)
        .catch(() => {});
    }

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
      eth.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [detectProvider, readAccounts, readChain, ensureProvider]);

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
