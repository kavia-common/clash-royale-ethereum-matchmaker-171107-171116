import React from "react";
import { useEthereumWallet } from "../hooks/useEthereumWallet";
import Banner from "./ui/Banner";

/**
 * PUBLIC_INTERFACE
 * WalletStatus shows wallet account and connect/disconnect controls.
 */
export default function WalletStatus() {
  const {
    account,
    isCorrectNetwork,
    connecting,
    error,
    connect,
    disconnect,
    HAS_API,
  } = useEthereumWallet();

  return (
    <div className="wallet-status">
      {!HAS_API && (
        <Banner tone="info" title="Mock API Active">
          No backend configured. Using mock data for preview.
        </Banner>
      )}
      {(String(process.env.REACT_APP_DRY_RUN_ESCROW || "").toLowerCase() === "true" ||
        !process.env.REACT_APP_ESCROW_ADDRESS) ? (
        <Banner tone="warning" title="Dry-run Escrow">
          Deposits will be simulated. No real funds are used.
        </Banner>
      ) : null}
      <div className="card">
        <div className="row space-between">
          <strong>Wallet</strong>
          {account ? (
            <button className="btn" onClick={disconnect}>
              Disconnect
            </button>
          ) : (
            <button className="btn-primary" onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
        <div className="mt-2">
          {account ? (
            <>
              <div>Account: {account}</div>
              <div>
                Network: {isCorrectNetwork ? "Supported" : "Wrong network (use target chain)"}
              </div>
            </>
          ) : (
            <div>No wallet connected.</div>
          )}
        </div>
        {error && <div className="error mt-2">{String(error.message || error)}</div>}
      </div>
    </div>
  );
}
