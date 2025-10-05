import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";
import "./theme.css";
import "./App.css";
import WalletStatus from "./components/WalletStatus";
import ProfileList from "./components/ProfileList";
import WagerFilter from "./components/WagerFilter";
import DepositsDashboard from "./components/DepositsDashboard";
import GameHistoryPage from "./pages/GameHistoryPage";
import { api } from "./services/api";
import LinkAccountModal from "./components/LinkAccountModal";

function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api().getProfiles();
      setProfiles(data);
      setFiltered(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilter = useCallback(
    (f) => {
      const next = profiles.filter((p) => {
        const amt = Number(p.preferredWagerEth || 0);
        const minOk = f.min == null || amt >= f.min;
        const maxOk = f.max == null || amt <= f.max;
        return minOk && maxOk;
      });
      setFiltered(next);
    },
    [profiles]
  );

  return { profiles: filtered, loading, applyFilter, reload: load };
}

/**
 * PUBLIC_INTERFACE
 * Main application shell: header + nav, wallet status, profile listing with filter,
 * history and settings routes. Works with mock API when backend URL is not provided.
 */
export default function App() {
  const { profiles, loading, applyFilter } = useProfiles();
  const [route, setRoute] = useState(window.location.pathname);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to) => {
    window.history.pushState({}, "", to);
    setRoute(to);
  }, []);

  const content = useMemo(() => {
    if (route === "/history") {
      return <GameHistoryPage />;
    }
    if (route === "/settings") {
      return (
        <div className="card">
          <h3>Settings</h3>
          <p>Link your Clash Royale account to enhance matchmaking.</p>
          <button className="btn-primary" onClick={() => setLinkOpen(true)}>
            Link account
          </button>
        </div>
      );
    }
    return (
      <div className="layout">
        <aside className="sidebar">
          <WagerFilter onChange={applyFilter} />
          <div className="mt-4">
            <DepositsDashboard />
          </div>
        </aside>
        <main className="main">
          <ProfileList profiles={profiles} loading={loading} onChallenge={() => {}} />
        </main>
      </div>
    );
  }, [route, profiles, loading, applyFilter]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand" onClick={() => navigate("/")}>
          Clash Royale ETH Matchmaker
        </div>
        <nav>
          <button className="link" onClick={() => navigate("/")}>
            Home
          </button>
          <button className="link" onClick={() => navigate("/history")}>
            History
          </button>
          <button className="link" onClick={() => navigate("/settings")}>
            Settings
          </button>
        </nav>
        <div className="wallet-area">
          <WalletStatus />
        </div>
      </header>
      <div className="container">{content}</div>
      <LinkAccountModal open={linkOpen} onClose={() => setLinkOpen(false)} />
    </div>
  );
}
