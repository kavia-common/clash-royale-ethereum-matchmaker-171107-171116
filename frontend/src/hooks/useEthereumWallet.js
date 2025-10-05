//
// hooks/useEthereumWallet.js
//
// PUBLIC_INTERFACE
// React hook to manage wallet connection with mock fallback.
// Validates chain against REACT_APP_CHAIN_ID (default to 11155111 for preview).
//

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const TARGET_CHAIN_ID = Number(process.env.REACT_APP_CHAIN_ID || 11155111);
const HAS_API = !!process.env.REACT_APP_API_URL;

// PUBLIC_INTERFACE
export function useEthereumWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [siweSession, setSiweSession] = useState(null);

  const isCorrectNetwork = useMemo(() => {
    if (!chainId) return false;
    return Number(chainId) === TARGET_CHAIN_ID;
  }, [chainId]);

  useEffect(() => {
    if (typeof window !== "undefined" && window?.ethereum?.chainId) {
      setChainId(parseInt(window.ethereum.chainId, 16));
    }
    const onChainChanged = (hex) => setChainId(parseInt(hex, 16));
    const onAccountsChanged = (accs) => setAccount(accs?.[0] || null);

    if (typeof window !== "undefined" && window?.ethereum?.on) {
      window.ethereum.on("chainChanged", onChainChanged);
      window.ethereum.on("accountsChanged", onAccountsChanged);
    }
    return () => {
      if (typeof window !== "undefined" && window?.ethereum?.removeListener) {
        window.ethereum.removeListener("chainChanged", onChainChanged);
        window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      let acc = null;
      if (window?.ethereum?.request) {
        const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
        acc = accs?.[0] || null;
        setAccount(acc);
        const chainHex = await window.ethereum.request({ method: "eth_chainId" });
        setChainId(parseInt(chainHex, 16));
      } else {
        if (!HAS_API) {
          acc = "0xMockPreview00000000000000000000000000000001";
          setAccount(acc);
          setChainId(TARGET_CHAIN_ID);
        } else {
          throw new Error("No Ethereum provider found.");
        }
      }

      // Optional mock SIWE flow
      const client = api();
      const { nonce } = await client.auth.nonce();
      let signature = "0xmocksignature";
      let message = `Sign in with Ethereum\nNonce: ${nonce}`;
      if (window?.ethereum?.request && acc) {
        try {
          message = `Clash Royale ETH Matchmaker wants you to sign in.\nNonce: ${nonce}`;
          signature = await window.ethereum.request({
            method: "personal_sign",
            params: [message, acc],
          });
        } catch {
          signature = "0xmocksignature";
        }
      }
      await client.auth.verify({ message, signature, address: acc });
      setSiweSession({ address: acc, message, signature });
    } catch (e) {
      setError(e);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setSiweSession(null);
    setError(null);
  }, []);

  return {
    account,
    chainId,
    isCorrectNetwork,
    connecting,
    error,
    siweSession,
    connect,
    disconnect,
    HAS_API,
  };
}
