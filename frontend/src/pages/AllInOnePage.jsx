import React, { useCallback, useMemo, useState } from 'react';
import WalletStatus from '../components/WalletStatus';
import WagerFilter from '../components/WagerFilter';
import ProfileList from '../components/ProfileList';
import EscrowModal from '../components/EscrowModal';
import DepositsDashboard from '../components/DepositsDashboard';
import GameHistoryDashboard from '../components/GameHistoryDashboard';
import Banner from '../components/ui/Banner';
import '../App.css';
import '../theme.css';

/**
 * PUBLIC_INTERFACE
 * AllInOnePage
 * This page composes wallet status, wager filters, profile list with challenge/deposit actions,
 * escrow modal for deposit/withdraw, deposits/balances dashboard, and game history
 * into a single unified screen. Designed to be the Home route "/".
 */
const AllInOnePage = () => {
  // Local UI state to coordinate EscrowModal open/close and mode
  const [escrowOpen, setEscrowOpen] = useState(false);
  const [escrowMode, setEscrowMode] = useState('deposit'); // 'deposit' | 'withdraw'
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [wagerFilter, setWagerFilter] = useState({ min: 0, max: 10 });

  // Handlers to open EscrowModal in specific modes
  const openDeposit = useCallback((opponent = null) => {
    setSelectedOpponent(opponent);
    setEscrowMode('deposit');
    setEscrowOpen(true);
  }, []);

  const openWithdraw = useCallback(() => {
    setSelectedOpponent(null);
    setEscrowMode('withdraw');
    setEscrowOpen(true);
  }, []);

  const closeEscrow = useCallback(() => setEscrowOpen(false), []);

  // Wager filter change passthrough
  const handleWagerChange = useCallback((range) => {
    setWagerFilter(range);
  }, []);

  // Memoized props for ProfileList to preserve stable refs
  const profileListActions = useMemo(
    () => ({
      onChallenge: (profile) => {
        // Start a challenge flow - typically requires deposit first
        setSelectedOpponent(profile);
        setEscrowMode('deposit');
        setEscrowOpen(true);
      },
      onDeposit: () => openDeposit(null),
    }),
    [openDeposit]
  );

  return (
    <div className="ocean-container bg-surface min-h-screen">
      {/* Mock API and Dry-run banners remain visible */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-2">
        <Banner type="info" text="Mock API enabled: demo data and flows are active for preview." />
        <Banner type="warning" text="Dry-run escrow: Blockchain transactions are simulated in this environment." />
      </div>

      {/* Header and Wallet */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Clash Royale • Ethereum Matchmaker</h1>
            <p className="text-gray-600">Find players, set wagers, and escrow safely.</p>
          </div>
          <div className="w-full md:w-auto">
            <WalletStatus />
          </div>
        </div>
      </header>

      {/* Main layout with sidebar filter and content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-3">
            <div className="card card-surface shadow-sm rounded-lg p-4">
              <h2 className="text-lg font-semibold text-text mb-2">Filters</h2>
              <WagerFilter value={wagerFilter} onChange={handleWagerChange} />
            </div>

            <div className="card card-surface shadow-sm rounded-lg p-4 mt-6">
              <h3 className="text-md font-semibold text-text mb-2">Escrow</h3>
              <p className="text-sm text-gray-600 mb-3">Manage deposits and withdrawals.</p>
              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  onClick={() => openDeposit(null)}
                  aria-label="Open deposit modal"
                >
                  Deposit
                </button>
                <button
                  className="btn-secondary"
                  onClick={openWithdraw}
                  aria-label="Open withdraw modal"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <section className="lg:col-span-9 space-y-6">
            {/* Deposits / Balances */}
            <div className="card card-surface shadow-sm rounded-lg p-4">
              <DepositsDashboard
                onDeposit={() => openDeposit(null)}
                onWithdraw={openWithdraw}
              />
            </div>

            {/* Profiles and Actions */}
            <div className="card card-surface shadow-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-text">Available Players</h2>
                <div className="text-sm text-gray-500">
                  Wager: {wagerFilter.min} - {wagerFilter.max} ETH
                </div>
              </div>
              <ProfileList
                minWager={wagerFilter.min}
                maxWager={wagerFilter.max}
                onChallenge={profileListActions.onChallenge}
                onDeposit={profileListActions.onDeposit}
              />
            </div>

            {/* Game History */}
            <div className="card card-surface shadow-sm rounded-lg p-4">
              <h2 className="text-lg font-semibold text-text mb-2">Game History</h2>
              <GameHistoryDashboard />
            </div>
          </section>
        </div>
      </main>

      {/* Escrow Modal (deposit/withdraw mode) */}
      <EscrowModal
        isOpen={escrowOpen}
        onClose={closeEscrow}
        // Provide optional mode prop for compatibility; components should ignore if unsupported
        mode={escrowMode}
        opponent={selectedOpponent}
      />
    </div>
  );
};

export default AllInOnePage;
