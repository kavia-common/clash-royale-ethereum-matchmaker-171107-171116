import React, { useState, useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import LinkAccountModal from './components/LinkAccountModal';
import WalletStatus from './components/WalletStatus';
import WagerFilter from './components/WagerFilter';
import ProfileList from './components/ProfileList';
import DepositsDashboard from './components/DepositsDashboard';
import TierSelectionModal from './components/TierSelectionModal';
import ClashRoyaleDashboard from './components/ClashRoyaleDashboard';
import GameHistoryDashboard from './components/GameHistoryDashboard';
import GameHistoryPage from './pages/GameHistoryPage';
import SettingsModal from './components/SettingsModal';
import CharacterFeatureHero from './components/CharacterFeatureHero';
import './components/CharacterFeatureHero.css';
import { apiGetProfiles, apiLinkAccount, apiGetLiveWagers, apiGetGameHistory } from './services/api';
import { Banner } from './components/ui';

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
  const location = useLocation();
  const [theme, setTheme] = useState('light');
  const [linkOpen, setLinkOpen] = useState(false);
  const [tiersOpen, setTiersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const hasBackend = !!process.env.REACT_APP_API_URL;
  const dryRun = !hasBackend || String(process.env.REACT_APP_DRY_RUN_ESCROW || '') === 'true';
  const debounceRef = React.useRef(null);

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    const run = async (params = {}) => {
      setLoadingProfiles(true);
      setProfilesError('');
      try {
        const res = await apiGetProfiles(params);
        if (!mounted) return;
        setProfiles(Array.isArray(res) ? res : (res?.items || []));
      } catch (e) {
        setProfilesError(e?.message || 'Failed to load profiles.');
      } finally {
        if (mounted) setLoadingProfiles(false);
      }
    };

    // Initial load
    run();

    return () => {
      mounted = false;
    };
  }, []);

  // Debounced refetch when backend exists and filters change
  useEffect(() => {
    if (!hasBackend) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = {};
      if (filter?.min != null) params.minWager = filter.min;
      if (filter?.max != null && isFinite(filter.max)) params.maxWager = filter.max;
      apiGetProfiles(params)
        .then((res) => {
          const data = Array.isArray(res) ? res : (res?.items || []);
          setProfiles(data);
        })
        .catch((e) => setProfilesError(e?.message || 'Failed to load profiles.'));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [hasBackend, filter]);

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

  const isHome = location.pathname === '/' || location.pathname === '';

  return (
    <div className="App" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Render the main hero and list only on the home route */}
      {isHome && (
        <>
          {dryRun && (
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 16px' }}>
              <Banner
                variant="warning"
                message={<>Running in mock/dry-run mode. Some blockchain and API flows are simulated.</>}
                action={{ label: 'README', href: 'https://github.com' }}
              />
            </div>
          )}
          {/* Prominent top-level Make Wager button (pill/oval) */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 60,
              background: 'linear-gradient(180deg, rgba(249,250,251,0.98), rgba(255,255,255,0.9))',
              borderBottom: '1px solid #E5E7EB',
              boxShadow: '0 8px 22px rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{
                maxWidth: 1180,
                margin: '0 auto',
                padding: '12px 16px',
              }}
            >
              <button
                type="button"
                onClick={goToGameHistoryPrefetch}
                aria-label="Make Wager and view game history"
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 900,
                  margin: '0 auto',
                  height: 64,
                  borderRadius: 9999,
                  background: '#10B981',
                  color: '#FFFFFF',
                  border: '2px solid #059669',
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: 0.4,
                  cursor: 'pointer',
                  boxShadow: '0 14px 32px rgba(16,185,129,0.35)',
                  transition: 'transform .12s ease, box-shadow .2s ease, opacity .2s ease',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 18px 40px rgba(16,185,129,0.45)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 14px 32px rgba(16,185,129,0.35)')}
              >
                Make Wager
              </button>
            </div>
          </div>

          {/* Character Feature Hero */}
          <CharacterFeatureHero
            title="Challenge the Arena. Wager with Confidence."
            subtitle="Find players, set Ethereum-backed wagers, and play fair with escrow-protected matches."
            primaryCta={{ label: 'Play Now', href: '#', onClick: () => setTiersOpen(true) }}
            secondaryCta={{ label: 'Learn More', href: '/game-history' }}
          />

          {/* Top header/navigation */}
          <div
            style={{
              width: '100%',
              position: 'sticky',
              top: 80,
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
                  onClick={() => setLinkOpen(true)}
                  style={{
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #E5E7EB',
                    padding: '10px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  aria-label="Link Clash Royale Account"
                >
                  Link Clash Royale Account
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
              margin: '24px auto',
              padding: '0 16px 44px',
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
        </>
      )}

      {/* Persistent modals */}
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

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ClashRoyaleDashboard
        open={crOpen}
        onClose={() => setCrOpen(false)}
        playerTag={crTag}
        accessToken={crToken}
      />

      {/* App-level routes */}
      <Routes>
        <Route
          path="/"
          element={<HomePlaceholder onNavigateHistory={goToGameHistoryPrefetch} />}
        />
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
        <Route path="/wager/:id" element={<WagerDetailsRoute />} />
        <Route path="/settings" element={<SettingsRoute onOpen={() => setSettingsOpen(true)} />} />
      </Routes>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * HomePlaceholder
 * Lightweight component to satisfy "/" route in Router config (main content renders conditionally above).
 */
function HomePlaceholder({ onNavigateHistory }) {
  /** This is a public function. */
  useEffect(() => {
    // No-op; real home is rendered conditionally in App.
  }, []);
  return <div style={{ display: 'none' }} aria-hidden="true" />;
}

/**
 * PUBLIC_INTERFACE
 * WagerDetailsRoute
 * Simple placeholder for /wager/:id route.
 */
function WagerDetailsRoute() {
  /** This is a public function. */
  const { id } = useParams();
  return (
    <div style={{
      maxWidth: 980, margin: '24px auto', padding: '0 16px',
      background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, paddingBottom: 16,
    }}>
      <div style={{ padding: 16 }}>
        <h1 style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#111827' }}>
          Wager Details
        </h1>
        <p style={{ color: '#374151' }}>
          Placeholder route. Wager ID: <strong>{id}</strong>
        </p>
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * SettingsRoute
 * Placeholder for /settings which opens the existing SettingsModal via prop.
 */
function SettingsRoute({ onOpen }) {
  /** This is a public function. */
  useEffect(() => {
    onOpen?.();
  }, [onOpen]);
  return (
    <div style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#111827' }}>
        Settings
      </h1>
      <p style={{ color: '#374151' }}>
        Settings modal opened. This page serves as a route anchor for settings actions.
      </p>
    </div>
  );
}

export default App;
