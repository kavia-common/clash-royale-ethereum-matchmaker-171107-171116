import React from "react";
import Skeleton from "./ui/Skeleton";

/**
 * PUBLIC_INTERFACE
 * ProfileList shows list of profiles and allows initiating a challenge.
 * Props:
 * - profiles: array of profile items
 * - loading: boolean
 * - onChallenge(profile): function
 * - onDeposit?: function() optional
 */
export default function ProfileList({ profiles = [], loading = false, onChallenge, onDeposit }) {
  if (loading) {
    return (
      <div className="grid">
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </div>
    );
    }
  if (!profiles || profiles.length === 0) {
    return <div className="muted">No profiles found.</div>;
  }
  return (
    <div className="grid" role="list" aria-label="Matchmaking profiles">
      {profiles.map((p) => (
        <div key={p.id || p.crTag || p.name} className="card" role="listitem">
          <div className="row space-between">
            <div>
              <div className="title">{p.name}</div>
              <div className="muted">
                {p.crTag} • {p.trophy || p.trophies || "—"} trophies • Prefers {p.preferredWagerEth} ETH
              </div>
              {p.online != null && (
                <div className={p.online ? "badge success" : "badge"}>
                  {p.online ? "Online" : "Offline"}
                </div>
              )}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn-secondary"
                onClick={() => onChallenge?.(p)}
                aria-label={`Challenge ${p.name}`}
              >
                Challenge
              </button>
              {onDeposit && (
                <button className="btn" onClick={() => onDeposit()} aria-label="Deposit">
                  Deposit
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
