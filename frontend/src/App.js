import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";
import "./theme.css";
import "./App.css";
import WalletStatus from "./components/WalletStatus";
import GameHistoryPage from "./pages/GameHistoryPage";
import LinkAccountModal from "./components/LinkAccountModal";
import Banner from "./components/ui/Banner";
import AllInOnePage from "./pages/AllInOnePage";

/**
 * PUBLIC_INTERFACE
 * App provides top-level navigation and banners, and renders pages:
 * - "/" AllInOnePage (unified view)
 * - "/history" GameHistoryPage
 * - "/settings" Settings (inline section)
 * Uses simple pushState routing to avoid changing deps.
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

  const content = useMemo(() => {
    if (route === "/history") {
      return <GameHistoryPage />;
    }
    if (route === "/settings") {
      return (
        <div className="container">
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Settings</h3>
            <p>Manage connections and account links.</p>
            <button className="btn-primary" onClick={() => setLinkOpen(true)}>
              Link Clash Royale
            </button>
          </div>
        </div>
      );
    }
    // default home
    return <AllInOnePage />;
  }, [route]);

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
    </div>
  );
}
