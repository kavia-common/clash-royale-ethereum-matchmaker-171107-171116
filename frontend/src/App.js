import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import LinkAccountModal from './components/LinkAccountModal';

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const [linkOpen, setLinkOpen] = useState(false);

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // PUBLIC_INTERFACE
  const handleLinkSubmit = async ({ tag, token, mode }) => {
    /** Placeholder for backend API; logs and resolves. */
    // In future, use env var: process.env.REACT_APP_API_URL
    // and POST to /api/link-account with { tag, token }
    // e.g., await fetch(`${process.env.REACT_APP_API_URL}/link-account`, { ... })
    // For now, just log for visibility.
    // eslint-disable-next-line no-console
    console.log('Stub submit ->', { tag, token, mode });
  };

  return (
    <div className="App" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <header
        className="App-header"
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-secondary)',
          position: 'relative',
        }}
      >
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        {/* Minimal header bar with action button following Ocean Professional theme */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 140, // keep clear of theme toggle
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setLinkOpen(true)}
              style={{
                background: '#2563EB',
                color: '#ffffff',
                border: '1px solid transparent',
                padding: '10px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
              }}
              aria-label="Link Clash Royale Account"
            >
              Link Clash Royale Account
            </button>
          </div>
        </div>

        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <p>
          Current theme: <strong data-testid="theme-value">{theme}</strong>
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>

      <LinkAccountModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={handleLinkSubmit}
      />
    </div>
  );
}

export default App;
