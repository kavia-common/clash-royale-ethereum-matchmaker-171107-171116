import React, { useState, useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LinkAccountModal from './components/LinkAccountModal';
import WalletStatus from './components/WalletStatus';
import WagerFilter from './components/WagerFilter';
import ProfileList from './components/ProfileList';
import DepositsDashboard from './components/DepositsDashboard';
import TierSelectionModal from './components/TierSelectionModal';
import ClashRoyaleDashboard from './components/ClashRoyaleDashboard';
import GameHistoryDashboard from './components/GameHistoryDashboard';
import GameHistoryPage from './pages/GameHistoryPage';
import { apiGetProfiles, apiLinkAccount, apiGetLiveWagers, apiGetGameHistory } from './services/api';

/**
 * PUBLIC_INTERFACE
 * App
 * Root component: manages theme, wallet status UI, profile fetch, and account linking.
 * Uses:
 * - REACT_APP_API_URL for backend
 * - REACT_APP_ESCROW_ADDRESS for escrow contract used in downstream components
 */
function App() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  const [linkOpen, setLinkOpen] = useState(false);
  const [tiersOpen, setTiersOpen] = useState(false);

  // Clash Royale linking state (frontend memory; real persistence should be backend/session)
  const [crTag, setCrTag] = useState('');
  const [crToken, setCrToken] = useState('');
  const [crOpen, setCrOpen] = useState(false);
  // Game history data prefetch state for immediate display on navigation
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchedLive, setPrefetchedLive] = useState(null);
  const [prefetchedHistory, setPrefetchedHistory] = useState(null);

  // Helper to prefetch live wagers and game history before navigating to /game-history
  // PUBLIC_INTERFACE
  const goToGameHistoryPrefetch = async () => {
    setPrefetching(true);
    setPrefetchedLive(null);
    setPrefetchedHistory(null);
    try {
      const [live, history] = await Promise.allSettled([
        apiGetLiveWagers(),
        apiGetGameHistory(),
      ]);
      if (live.status === 'fulfilled') {
        setPrefetchedLive(live.value);
      }
      if (history.status === 'fulfilled') {
        setPrefetchedHistory(history.value);
      }
    } catch {
      // non-fatal; page will fetch on mount as well
    } finally {
      setPrefetching(false);
      navigate('/game-history', { replace: false, state: { viaTopButtons: true } });
    }
  };

  // Profile data and filtering state
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [filter, setFilter] = useState({ min: 0.01, max: 5.0 });

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoadingProfiles(true);
      setProfilesError('');
      try {
        const res = await apiGetProfiles();
        if (!mounted) return;
        setProfiles(Array.isArray(res) ? res : (res?.items || []));
      } catch (e) {
        setProfilesError(e?.message || 'Failed to load profiles.');
      } finally {
        if (mounted) setLoadingProfiles(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // PUBLIC_INTERFACE
  const handleLinkSubmit = async ({ tag, token, mode }) => {
    /**
     * Submit account linking to backend.
     * If wallet integration is required for linking, that can be added by providing walletAddress here.
     * After successful linking, open the CR dashboard to show the user's stats (read-only).
     */
    await apiLinkAccount({ tag, token });
    if (tag) setCrTag(tag);
    if (token) setCrToken(token);
    // Immediately show stats panel after link success
    setCrOpen(true);
  };

  return (
    <div className="App" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Global top action buttons: Live (red) and Make a Wager (green) */}
      <div
        style={{
          width: '100%',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'linear-gradient(180deg, rgba(249,250,251,0.95), rgba(255,255,255,0.85))',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {/* Non-interactive red circle: Game History indicator */}
          <div
            aria-label="Game History indicator"
            title="Game History"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              border: '2px solid #DC2626',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              boxShadow: '0 6px 14px rgba(239,68,68,0.35)',
              userSelect: 'none',
            }}
          >
            GH
          </div>

          {/* Interactive green rectangle: Make a Wager navigates to /game-history */}
          <button
            onClick={goToGameHistoryPrefetch}
            aria-label="Make a wager"
            style={{
              backgroundColor: '#10B981',
              color: '#ffffff',
              border: '1px solid #10B981',
              padding: '10px 16px',
              borderRadius: 12,
              cursor: 'pointer',
              fontWeight: 800,
              letterSpacing: 0.3,
              boxShadow: '0 6px 14px rgba(16,185,129,0.35)',
              transition: 'transform .15s ease, box-shadow .2s ease, opacity .2s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Make a Wager
          </button>
        </div>
      </div>

      {/* Top header/navigation */}
      <div
        style={{
          width: '100%',
          position: 'sticky',
          top: 56,
          zIndex: 20,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
          backdropFilter: 'saturate(180%) blur(8px)',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 12,
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <span style={{ fontWeight: 800, color: '#111827' }}>CR Matchmaker</span>
            <span style={{ color: '#6B7280', fontSize: 12 }}>Ocean Professional</span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <WalletStatus />
            <button
              onClick={() => setTiersOpen(true)}
              style={{
                background: '#F59E0B',
                color: '#111827',
                border: '1px solid transparent',
                padding: '10px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
              }}
              aria-label="Open tier selection"
            >
              View Tiers
            </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content layout: side filter + central content */}
      <main
        style={{
          width: '100%',
          maxWidth: 1180,
          margin: '20px auto',
          padding: '0 16px 40px',
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <WagerFilter
          min={0.01}
          max={5.0}
          value={filter}
          onChange={(next) => setFilter(next)}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Prominent deposit & pending panel */}
          <DepositsDashboard />

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ margin: 0, fontWeight: 800, color: '#111827' }}>
              Player Profiles
            </h2>
            <div style={{ color: '#6B7280', fontSize: 13 }}>
              Theme: <strong data-testid="theme-value">{theme}</strong>
            </div>
          </div>
          {profilesError ? (
            <div style={{ color: '#EF4444' }} role="alert">{profilesError}</div>
          ) : (
            <ProfileList profiles={profiles} filter={filter} />
          )}
        </div>
      </main>

      <LinkAccountModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={handleLinkSubmit}
      />

      <TierSelectionModal
        open={tiersOpen}
        onClose={() => setTiersOpen(false)}
        onSelect={(tierId) => {
          // Placeholder: integrate with future subscription or account settings.
          // For now, log selection for visibility.
          // eslint-disable-next-line no-console
          console.log('Tier selected:', tierId);
        }}
      />

      <ClashRoyaleDashboard
        open={crOpen}
        onClose={() => setCrOpen(false)}
        playerTag={crTag}
        accessToken={crToken}
      />

      {/* App-level routes */}
      <Routes>
        <Route
          path="/game-history"
          element={
            <GameHistoryPage
              prefetching={prefetching}
              initialLive={prefetchedLive}
              initialHistory={prefetchedHistory}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
