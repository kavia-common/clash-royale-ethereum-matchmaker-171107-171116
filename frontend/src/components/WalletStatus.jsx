import React from "react";
import { useEthereumWallet } from "../hooks/useEthereumWallet";
import Banner from "./ui/Banner";

/**
 * PUBLIC_INTERFACE
 * WalletStatus shows wallet account and connect/disconnect controls.
 */
export default function WalletStatus() {
  const { account, isCorrectNetwork, connecting, error, connect, disconnect, HAS_API } =
    useEthereumWallet();

  return (
    <div className="wallet-status">
      {!HAS_API && (
        <Banner tone="info" title="Mock API Active">
          No backend configured. Using mock data for preview.
        </Banner>
      )}
      {process.env.REACT_APP_DRY_RUN_ESCROW === "true" ||
      !process.env.REACT_APP_ESCROW_ADDRESS ? (
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
```

Explanation: ProfileList renders profiles with skeletons and empty state; supports onChallenge handler.
````write file="clash-royale-ethereum-matchmaker-171107-171116/frontend/src/components/ProfileList.jsx"
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
```

Explanation: DepositsDashboard shows current wagers and actions to open escrow deposit modal. Basic for preview/tests.
````write file="clash-royale-ethereum-matchmaker-171107-171116/frontend/src/components/DepositsDashboard.jsx"
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
    return () => (mounted = false);
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
```

Explanation: WagerFilter input for filtering by min/max ETH, emitting onChange.
````write file="clash-royale-ethereum-matchmaker-171107-171116/frontend/src/components/WagerFilter.jsx"
import React, { useEffect, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * WagerFilter allows inputting min/max wager amounts and notifies parent on change.
 */
export default function WagerFilter({ onChange }) {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  useEffect(() => {
    const m = parseFloat(min);
    const M = parseFloat(max);
    onChange?.({
      min: isNaN(m) ? null : m,
      max: isNaN(M) ? null : M,
    });
  }, [min, max, onChange]);

  return (
    <div className="card">
      <div className="title">Filter by wager (ETH)</div>
      <div className="row">
        <label>
          Min
          <input
            type="number"
            step="0.001"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="0.01"
          />
        </label>
        <label>
          Max
          <input
            type="number"
            step="0.001"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="0.10"
          />
        </label>
      </div>
    </div>
  );
}
```

Explanation: GameHistoryPage lists historical matches via api mock; uses simple UI primitives.
````write file="clash-royale-ethereum-matchmaker-171107-171116/frontend/src/pages/GameHistoryPage.jsx"
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import Spinner from "../components/ui/Spinner";

/**
 * PUBLIC_INTERFACE
 * GameHistoryPage shows previous matches for the user.
 */
export default function GameHistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api().getHistory();
        if (mounted) setItems(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  return (
    <div>
      <h2>Game History</h2>
      {loading ? (
        <div className="row">
          <Spinner /> <span>Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="muted">No history found.</div>
      ) : (
        <div className="grid">
          {items.map((h) => (
            <div key={h.id} className="card">
              <div className="row space-between">
                <div className="title">vs {h.opponent}</div>
                <div className={h.result === "win" ? "badge success" : "badge error"}>
                  {h.result}
                </div>
              </div>
              <div className="muted">
                {h.amountEth} ETH • {new Date(h.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Explanation: UI primitives - Banner, InlineError, Skeleton, Spinner; align with Ocean Professional theme and accessibility.
````write file="clash-royale-ethereum-matchmaker-171107-171116/frontend/src/components/ui/Banner.jsx"
import React from "react";

/**
 * PUBLIC_INTERFACE
 * Banner displays contextual information at top of sections.
 */
export default function Banner({ tone = "info", title, children }) {
  return (
    <div className={`banner banner-${tone}`} role="status" aria-live="polite">
      {title && <strong className="mr-2">{title}:</strong>} {children}
    </div>
  );
}
