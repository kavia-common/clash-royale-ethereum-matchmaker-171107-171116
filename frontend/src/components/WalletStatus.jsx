import React, { useEffect, useMemo, useState } from "react";
import { useEthereumWallet } from "../hooks/useEthereumWallet";
import { Banner } from "./ui";
import LinkAccountModal from "./LinkAccountModal";
import { useAppDispatch, useAppSelector } from "../state/store";
import { setCrAccountData, setSliceError, setSliceLoading } from "../state/actions";
import { selectCRLinked, selectCRProfile } from "../state/selectors";
import { apiGetCRMe } from "../services/api";

/**
 * PUBLIC_INTERFACE
 * WalletStatus shows wallet account and connect/disconnect controls, plus CR link entry.
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

  const [linkOpen, setLinkOpen] = useState(false);
  const dispatch = useAppDispatch();
  const crLinked = useAppSelector(selectCRLinked);
  const crProfile = useAppSelector(selectCRProfile);

  // Load CR link status when account changes
  useEffect(() => {
    let canceled = false;
    const run = async () => {
      if (!account) {
        dispatch(setCrAccountData({ linked: false }));
        return;
      }
      dispatch(setSliceLoading("crAccount", true));
      try {
        const me = await apiGetCRMe();
        if (!canceled) dispatch(setCrAccountData(me));
      } catch (e) {
        if (!canceled) dispatch(setSliceError("crAccount", e?.message || "Failed to load link status"));
      } finally {
        if (!canceled) dispatch(setSliceLoading("crAccount", false));
      }
    };
    run();
    return () => { canceled = true; };
  }, [account, dispatch]);

  useEffect(() => {
    const onSuccess = () => setLinkOpen(false);
    window.addEventListener("cr-link-success", onSuccess);
    return () => window.removeEventListener("cr-link-success", onSuccess);
  }, []);

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
                Network: {isCorrectNetwork ? "Supported" : "Wrong network (use target chain)"}
              </div>
            </>
          ) : (
            <div>No wallet connected.</div>
          )}
        </div>
        {error && <div className="error mt-2" role="alert">{String(error.message || error)}</div>}
        <div className="row mt-2">
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
        </div>
      </div>

      {account && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="row space-between">
            <strong>Clash Royale</strong>
            {crLinked ? (
              <span className="badge">Linked</span>
            ) : (
              <span className="badge">Not linked</span>
            )}
          </div>
          <div className="mt-2">
            {crLinked ? (
              <div>Linked as {crProfile?.tag || "Unknown"}</div>
            ) : (
              <div>Link your Clash Royale account for better matchmaking.</div>
            )}
          </div>
          <div className="row mt-2">
            {!crLinked ? (
              <button className="btn-primary" onClick={() => setLinkOpen(true)}>
                Link Clash Royale
              </button>
            ) : (
              <button className="btn" onClick={() => setLinkOpen(true)}>
                Manage
              </button>
            )}
          </div>
        </div>
      )}

      <LinkAccountModal open={linkOpen} onClose={() => setLinkOpen(false)} />
    </div>
  );
}
