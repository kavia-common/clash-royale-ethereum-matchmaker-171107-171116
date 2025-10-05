import React, { useEffect, useState } from "react";
import { getEscrowClient } from "../services/blockchain";
import { api } from "../services/api";
import Spinner from "./ui/Spinner";

/**
 * PUBLIC_INTERFACE
 * EscrowModal displays a deposit or withdraw flow for a given wager.
 * Props:
 * - open: boolean
 * - onClose: function
 * - wager: { id, amountEth, opponent? }
 * - mode?: 'deposit' | 'withdraw' (optional, default 'deposit')
 */
export default function EscrowModal({ open, onClose, wager, mode = "deposit" }) {
  const [step, setStep] = useState("idle");
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const client = getEscrowClient();

  useEffect(() => {
    if (open) {
      setStep("idle");
      setTxHash(null);
      setError(null);
    }
  }, [open, wager?.id, mode]);

  const onDeposit = async () => {
    setError(null);
    setStep("submitting");
    try {
      const res = await client.deposit({
        from: "0xUser",
        wagerId: wager.id,
        amountEth: wager.amountEth || 0.01,
      });
      setTxHash(res.txHash);
      setStep("pending");
      const receipt = await res.wait();
      if (receipt?.status === 1) {
        setStep("confirmed");
        try {
          await api().notifyDeposit({ wagerId: wager.id, txHash: res.txHash });
        } catch {
          // ignore in mock
        }
      } else {
        setStep("failed");
      }
    } catch (e) {
      setError(e.message || String(e));
      setStep("failed");
    }
  };

  const onWithdraw = async () => {
    setError(null);
    setStep("submitting");
    try {
      const res = await client.withdraw({
        from: "0xUser",
        wagerId: wager.id,
      });
      setTxHash(res.txHash);
      setStep("pending");
      const receipt = await res.wait();
      if (receipt?.status === 1) {
        setStep("confirmed");
        try {
          await api().notifyWithdraw({ wagerId: wager.id, txHash: res.txHash });
        } catch {
          // ignore in mock
        }
      } else {
        setStep("failed");
      }
    } catch (e) {
      setError(e.message || String(e));
      setStep("failed");
    }
  };

  if (!open) return null;

  const isWithdraw = mode === "withdraw";
  const title = isWithdraw ? "Escrow Withdraw" : "Escrow Deposit";

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="escrow-title">
      <div className="modal">
        <header className="modal-header">
          <h3 id="escrow-title">{title}</h3>
          <button aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal-body">
          {!isWithdraw ? (
            <p>
              You are depositing {wager?.amountEth ?? 0.01} ETH into escrow for wager {wager?.id}.
            </p>
          ) : (
            <p>Withdraw available funds from escrow for wager {wager?.id}.</p>
          )}
          {client.dryRun && (
            <p className="muted">
              Dry-run active — this simulates a {isWithdraw ? "withdrawal" : "deposit"}. No real funds are used.
            </p>
          )}
          {step === "idle" && (
            <button className="btn-primary" onClick={isWithdraw ? onWithdraw : onDeposit}>
              {isWithdraw ? "Withdraw" : "Deposit"}
            </button>
          )}
          {step === "submitting" && (
            <div className="row">
              <Spinner /> <span>Submitting transaction…</span>
            </div>
          )}
          {step === "pending" && (
            <div className="row">
              <Spinner /> <span>Waiting for confirmation… tx: {txHash}</span>
            </div>
          )}
          {step === "confirmed" && (
            <div className="badge success">{isWithdraw ? "Withdrawal" : "Deposit"} confirmed! tx: {txHash}</div>
          )}
          {step === "failed" && <div className="badge error">Failed: {error}</div>}
        </div>
        <footer className="modal-footer">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
