import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import EscrowModal from "./EscrowModal";
import Spinner from "./ui/Spinner";

/**
 * PUBLIC_INTERFACE
 * DepositsDashboard lists live wagers and allows depositing into escrow.
 */
export default function DepositsDashboard() {
  const [wagers, setWagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api().getLive();
        if (mounted) setWagers(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="row">
        <Spinner /> <span>Loading wagers…</span>
      </div>
    );
  }

  return (
    <div>
      <h3>Your Wagers</h3>
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
