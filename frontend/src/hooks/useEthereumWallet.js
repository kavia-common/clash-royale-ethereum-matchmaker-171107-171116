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
   * Stability and UX:
   * - Never clear or overwrite address/chainId from init while user is connecting.
   * - Set address and chainId atomically on connect resolution (one state flush per flow).
   * - Initialize provider/signer once.
   */
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const initRan = useRef(false);

  // Guard flags
  const isManuallyConnecting = useRef(false); // true during connect() flow
  const initInFlight = useRef(false); // true while init Promise.all is running

  const isConnected = !!address;

  const detectProvider = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const { ethereum } = window;
    return ethereum || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const guardedSetAddress = useCallback((next) => {
    // Block any init-originated set while manual connect is active
    if (isManuallyConnecting.current) return;
    setAddress(next);
  }, []);

  const guardedSetChainId = useCallback((next) => {
    if (isManuallyConnecting.current) return;
    setChainId(next);
  }, []);

  const readAccounts = useCallback(async () => {
    try {
      const eth = detectProvider();
      if (!eth) return;
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        guardedSetAddress(ethers.utils.getAddress(accounts[0]));
      } else {
        // Do not clear address here; explicit disconnect or accountsChanged -> [] will clear it.
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read accounts', e);
    }
  }, [detectProvider, guardedSetAddress]);

  const readChain = useCallback(async () => {
    try {
      const eth = detectProvider();
      if (!eth) return;
      const id = await eth.request({ method: 'eth_chainId' });
      guardedSetChainId(id);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read chainId', e);
    }
  }, [detectProvider, guardedSetChainId]);

  // PUBLIC_INTERFACE
  const connect = useCallback(async () => {
    /** Prompt user to connect wallet via provider; set address+chainId synchronously once per flow. */
    setError('');
    setConnecting(true);
    isManuallyConnecting.current = true;
    try {
      const eth = detectProvider();
      if (!eth) {
        setError('No Ethereum wallet detected. Please install MetaMask.');
        return;
      }
      ensureProvider();

      // Resolve both concurrently and then set both states in one tick
      const [accounts, id] = await Promise.all([
        eth.request({ method: 'eth_requestAccounts' }),
        eth.request({ method: 'eth_chainId' }),
      ]);

      // Atomically set in the connect flow; this overrides any stale init reads.
      let nextAddr = '';
      if (accounts && accounts.length > 0) {
        nextAddr = ethers.utils.getAddress(accounts[0]);
      }

      // Use functional updates to batch into the same render
      setAddress(nextAddr);
      setChainId(id || '');

    } catch (e) {
      if (e?.code === 4001) {
        setError('Connection request rejected.');
      } else {
        setError(e?.message || 'Failed to connect wallet.');
      }
    } finally {
      setConnecting(false);
      isManuallyConnecting.current = false;
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

  useEffect(() => {
    const eth = detectProvider();
    if (!eth) return;

    const handleAccountsChanged = (accounts) => {
      // These are external provider events; allow them regardless of init flag.
      if (accounts && accounts.length > 0) {
        setAddress(ethers.utils.getAddress(accounts[0]));
      } else {
        setAddress(''); // explicit disconnect
      }
    };
    const handleChainChanged = (id) => {
      setChainId(id);
    };

    eth.on?.('accountsChanged', handleAccountsChanged);
    eth.on?.('chainChanged', handleChainChanged);

    if (!initRan.current) {
      initRan.current = true;
      ensureProvider();

      // Mark init in flight so we can block any of its updates while connect is active
      initInFlight.current = true;
      Promise.resolve().then(async () => {
        try {
          const [accounts, id] = await Promise.all([
            eth.request?.({ method: 'eth_accounts' }),
            eth.request?.({ method: 'eth_chainId' }),
          ]);

          // Only apply init results if not currently in manual connect
          if (!isManuallyConnecting.current) {
            if (accounts && accounts.length > 0) {
              guardedSetAddress(ethers.utils.getAddress(accounts[0]));
            }
            if (id) guardedSetChainId(id);
          }
        } catch {
          // silent
        } finally {
          initInFlight.current = false;
        }
      });
    }

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
      eth.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [detectProvider, ensureProvider, guardedSetAddress, guardedSetChainId]);

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
    theme,
  };
}
