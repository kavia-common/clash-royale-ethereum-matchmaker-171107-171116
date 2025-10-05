import React from "react";
import Skeleton from "./ui/Skeleton";

/**
 * PUBLIC_INTERFACE
 * ProfileList shows list of profiles and allows initiating a challenge.
 */
export default function ProfileList({ profiles, loading, onChallenge }) {
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
    <div className="grid">
      {profiles.map((p) => (
        <div key={p.id} className="card">
          <div className="row space-between">
            <div>
              <div className="title">{p.name}</div>
              <div className="muted">
                {p.crTag} • {p.trophy} trophies • Prefers {p.preferredWagerEth} ETH
              </div>
              <div className={p.online ? "badge success" : "badge"}>
                {p.online ? "Online" : "Offline"}
              </div>
            </div>
            <div>
              <button className="btn-secondary" onClick={() => onChallenge?.(p)}>
                Challenge
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
