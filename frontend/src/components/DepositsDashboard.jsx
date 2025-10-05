import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import EscrowModal from "./EscrowModal";
import Spinner from "./ui/Spinner";

/**
 * PUBLIC_INTERFACE
 * DepositsDashboard lists live wagers and allows depositing into escrow.
 * Uses the API client in mock mode when REACT_APP_API_URL is not set.
 * Props:
 * - onBanner?: function({type,msg})
 * - onDeposit?: function() optional button callback
 * - onWithdraw?: function() optional button callback
 */
export default function DepositsDashboard({ onBanner, onDeposit, onWithdraw }) {
  const [wagers, setWagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api().getLive();
        if (mounted) setWagers(data);
      } catch (e) {
        onBanner && onBanner({ type: "error", msg: e?.message || "Failed to load wagers." });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [onBanner]);

  if (loading) {
    return (
      <div className="row">
        <Spinner /> <span>Loading wagers…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="row space-between">
        <h3>Your Wagers</h3>
        {(onDeposit || onWithdraw) && (
          <div className="row" style={{ gap: 8 }}>
            {onDeposit && (
              <button className="btn-primary" onClick={onDeposit}>Deposit</button>
            )}
            {onWithdraw && (
              <button className="btn-secondary" onClick={onWithdraw}>Withdraw</button>
            )}
          </div>
        )}
      </div>
      {wagers.length === 0 && <div className="muted">No live wagers.</div>}
      {wagers.map((w) => (
        <div key={w.id} className="card row space-between">
          <div>
            <div className="title">vs {w.opponent?.name || "Opponent"}</div>
            <div className="muted">
              {w.amountEth} ETH • status: {w.status}
            </div>
          </div>
          <div>
            <button className="btn-primary" onClick={() => setSelected(w)}>
              Deposit
            </button>
          </div>
        </div>
      ))}
      <EscrowModal open={!!selected} onClose={() => setSelected(null)} wager={selected || {}} />
    </div>
  );
}
