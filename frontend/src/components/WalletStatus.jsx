import React, { useMemo } from "react";
import { useEthereumWallet } from "../hooks/useEthereumWallet";
import Banner from "./ui/Banner";

/**
 * PUBLIC_INTERFACE
 * WalletStatus shows wallet address, connect/disconnect, network status, and link CTA.
 * Props:
 * - onLinkClick: function to open link modal
 */
export default function WalletStatus({ onLinkClick }) {
  const {
    account,
    isCorrectNetwork,
    connecting,
    error,
    connect,
    disconnect,
    HAS_API,
  } = useEthereumWallet();

  const addressDisplay = useMemo(() => {
    if (!account) return "";
    const start = account.slice(0, 6);
    const end = account.slice(-4);
    return `${start}…${end}`;
  }, [account]);

  return (
    <div className="wallet-status">
      {!HAS_API && (
        <Banner type="info" style={{ marginBottom: 8 }}>
          Mock API Active: Using in-memory data for preview.
        </Banner>
      )}
      {(String(process.env.REACT_APP_DRY_RUN_ESCROW || "").toLowerCase() === "true" ||
        !process.env.REACT_APP_ESCROW_ADDRESS) ? (
        <Banner type="warning" style={{ marginBottom: 8 }}>
          Dry-run Escrow: Deposits are simulated. No real funds are used.
        </Banner>
      ) : null}

      <div className="card">
        <div className="row space-between">
          <strong>Wallet</strong>
          <span className="badge">{account ? "Connected" : "Disconnected"}</span>
        </div>
        <div className="mt-2">
          {account ? (
            <>
              <div data-testid="wallet-address">{addressDisplay}</div>
              <div>
                Network: {isCorrectNetwork ? "Supported" : "Wrong network (switch to configured chain)"}
              </div>
            </>
          ) : (
            <div>No wallet connected.</div>
          )}
        </div>
        {error && <div className="error mt-2" role="alert">{String(error.message || error)}</div>}
        <div className="row mt-2" style={{ gap: 8 }}>
          {account ? (
            <button
              className="btn"
              onClick={disconnect}
              aria-label="Disconnect Ethereum Wallet"
            >
              Disconnect
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={connect}
              disabled={connecting}
              aria-label="Connect Ethereum Wallet"
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
          <button className="btn-secondary" onClick={onLinkClick}>
            Link Clash Royale
          </button>
        </div>
      </div>
    </div>
  );
}
