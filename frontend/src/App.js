import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";
import "./theme.css";
import "./App.css";
import WalletStatus from "./components/WalletStatus";
import ProfileList from "./components/ProfileList";
import WagerFilter from "./components/WagerFilter";
import DepositsDashboard from "./components/DepositsDashboard";
import GameHistoryPage from "./pages/GameHistoryPage";
import LinkAccountModal from "./components/LinkAccountModal";
import Banner from "./components/ui/Banner";
import { api, apiGetProfiles } from "./services/api";

/**
 * PUBLIC_INTERFACE
 * App provides a single-page layout for the matchmaker with:
 * - Header + navigation and WalletStatus
 * - Left filter panel
 * - Center ProfileList
 * Also includes routes for history/settings via light path management (no react-router dependency needed).
 */
export default function App() {
  // env memoization: read once
  const env = useMemo(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "";
    const dryRunEscrow =
      String(process.env.REACT_APP_DRY_RUN_ESCROW || "").toLowerCase() ===
        "true" || !process.env.REACT_APP_ESCROW_ADDRESS;
    return { apiUrl, dryRunEscrow };
  }, []);

  // banners
  const [banners, setBanners] = useState(() => {
    const arr = [];
    if (!env.apiUrl) {
      arr.push({ id: "mockapi", type: "info", msg: "Mock API active (preview mode)." });
    }
    if (env.dryRunEscrow) {
      arr.push({
        id: "dryrun",
        type: "warning",
        msg: "Dry-run escrow enabled: deposits are simulated.",
      });
    }
    return arr;
  });
  const addBanner = useCallback((b) => {
    setBanners((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...b }]);
  }, []);
  const dismissBanner = useCallback((id) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // simple routes
  const [route, setRoute] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = useCallback((to) => {
    if (to === route) return;
    window.history.pushState({}, "", to);
    setRoute(to);
  }, [route]);

  // link modal control
  const [linkOpen, setLinkOpen] = useState(false);

  // Profiles + filters state
  const [profiles, setProfiles] = useState([]);
  const [filters, setFilters] = useState({ min: null, max: null, q: "" });
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [opponent, setOpponent] = useState(null); // when user clicks Challenge
  const [escrowOpen, setEscrowOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingProfiles(true);
      try {
        const list = await apiGetProfiles();
        if (mounted) setProfiles(list || []);
      } catch {
        if (mounted) setProfiles([]);
        addBanner({ type: "error", msg: "Failed to load profiles." });
      } finally {
        if (mounted) setLoadingProfiles(false);
      }
    })();
    return () => { mounted = false; };
  }, [addBanner]);

  const applyFilter = useCallback((f) => {
    // from WagerFilter: {min,max,q}
    setFilters((prev) => ({ ...prev, ...f }));
  }, []);

  const filteredProfiles = useMemo(() => {
    const min = filters.min;
    const max = filters.max;
    const q = String(filters.q || "").toLowerCase().trim();
    return profiles.filter((p) => {
      const amt = Number(p.preferredWagerEth || 0);
      const minOk = min == null || amt >= min;
      const maxOk = max == null || amt <= max;
      const qOk =
        !q ||
        [p.name, p.crTag, p.availability]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      return minOk && maxOk && qOk;
    });
  }, [profiles, filters]);

  const onChallenge = useCallback((profile) => {
    setOpponent(profile);
    setEscrowOpen(true);
  }, []);
  const closeEscrow = useCallback(() => {
    setEscrowOpen(false);
    setOpponent(null);
  }, []);

  const content = useMemo(() => {
    if (route === "/history") {
      return <GameHistoryPage />;
    }
    if (route === "/settings") {
      return (
        <div className="card">
          <h3>Settings</h3>
          <p>Manage connections and account links.</p>
          <button className="btn-primary" onClick={() => setLinkOpen(true)}>
            Link Clash Royale
          </button>
        </div>
      );
    }
    return (
      <div className="layout">
        <aside className="sidebar">
          <div className="card" style={{ marginBottom: 8 }}>
            <strong>Filters</strong>
          </div>
          <div className="card" style={{ marginBottom: 12 }}>
            <WagerFilter
              onChange={applyFilter}
              // backward-compatible alias if tests use applyFilter
              applyFilter={applyFilter}
            />
          </div>
          <div className="card">
            <DepositsDashboard />
          </div>
        </aside>
        <main className="main">
          <ProfileList
            profiles={filteredProfiles}
            loading={loadingProfiles}
            onChallenge={onChallenge}
          />
        </main>
      </div>
    );
  }, [route, filteredProfiles, loadingProfiles, applyFilter, onChallenge]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand" onClick={() => navigate("/")}>
          Ocean Matchmaker
        </div>
        <nav>
          <button className="link" onClick={() => navigate("/")}>Home</button>
          <button className="link" onClick={() => navigate("/history")}>History</button>
          <button className="link" onClick={() => navigate("/settings")}>Settings</button>
        </nav>
        <div className="wallet-area">
          <WalletStatus onLinkClick={() => setLinkOpen(true)} />
        </div>
      </header>

      <div className="container">
        {/* Banners */}
        {banners.map((b) => (
          <Banner
            key={b.id}
            type={b.type}
            onClose={() => dismissBanner(b.id)}
            style={{ marginBottom: 8 }}
          >
            {b.msg}
          </Banner>
        ))}

        {content}
      </div>

      <LinkAccountModal open={linkOpen} onClose={() => setLinkOpen(false)} />

      {/* Lightweight Escrow Modal: reuse EscrowModal component contract in project */}
      {escrowOpen && (
        // Using the existing EscrowModal component as separate page uses a different prop signature;
        // but for SPA default, we can show a simple inline modal hooking into opponent/preferred wager
        <div className="modal-backdrop">
          <div className="modal small">
            <header className="modal-header">
              <h3>Start Escrow</h3>
              <button aria-label="Close" onClick={closeEscrow}>×</button>
            </header>
            <div className="modal-body">
              <p>Opponent: {opponent?.name}</p>
              <p>Default wager: {opponent?.preferredWagerEth ?? 0.01} ETH</p>
              <button
                className="btn-primary"
                onClick={() => {
                  // Kick off mock wager initiation
                  api().initWager({
                    opponentId: opponent?.id,
                    amountEth: opponent?.preferredWagerEth ?? 0.01,
                  }).then((w) => {
                    addBanner({ type: "success", msg: `Wager initiated vs ${opponent?.name} for ${w.amountEth} ETH.` });
                    closeEscrow();
                  }).catch((e) => {
                    addBanner({ type: "error", msg: e?.message || "Failed to initiate wager." });
                  });
                }}
              >
                Initiate wager
              </button>
            </div>
            <footer className="modal-footer">
              <button className="btn" onClick={closeEscrow}>Close</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
