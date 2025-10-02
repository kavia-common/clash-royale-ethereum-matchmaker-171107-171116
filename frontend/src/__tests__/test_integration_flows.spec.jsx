/**
 * High-level integration tests for core user flows.
 * We mock network and Ethereum provider so tests don't require real backend/chain access.
 *
 * Style: Ocean Professional
 * primary: #2563EB, secondary: #F59E0B, background: #f9fafb, surface: #ffffff, text: #111827
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { ethers } from 'ethers';

// Helper: Build a deterministic mock of fetch for /profiles and other endpoints.
function mockFetchProfilesOnce({ profiles, status = 200 }) {
  const json = async () => profiles;
  const text = async () => JSON.stringify(profiles);
  const response = { ok: status >= 200 && status < 300, status, json, text };
  global.fetch = jest.fn((url, init) => {
    if (String(url).includes('/profiles') && (!init || init.method === 'GET')) {
      return Promise.resolve(response);
    }
    // Default simple OK for other calls if invoked
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    });
  });
}

/**
 * Helper: create a basic window.ethereum mock with eth_requestAccounts and eth_chainId.
 * Accepts addresses in any case but tests should pass in checksummed addresses.
 */
function installEthereumMock({ accounts = [ethers.utils.getAddress('0x1234567890abcdef1234567890abcdef12345678')], chainId = '0x1' } = {}) {
  const listeners = {};
  const ethMock = {
    request: jest.fn(async ({ method }) => {
      if (method === 'eth_accounts') return accounts;
      if (method === 'eth_requestAccounts') return accounts;
      if (method === 'eth_chainId') return chainId;
      return null;
    }),
    on: jest.fn((event, cb) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    removeListener: jest.fn((event, cb) => {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((fn) => fn !== cb);
    }),
    // simple trigger utility (not used currently but handy for future tests)
    __emit(event, ...args) {
      (listeners[event] || []).forEach((fn) => fn(...args));
    },
  };
  Object.defineProperty(window, 'ethereum', {
    value: ethMock,
    configurable: true,
    writable: true,
  });
  return ethMock;
}

// Reset jest mocks between tests
afterEach(() => {
  jest.resetAllMocks();
  // Do not leak ethereum mock between tests
  delete window.ethereum;
});

/**
 * 1) Profiles fetch integration test: mock API and verify UI shows expected profiles.
 */
describe('Integration: Profile listing and wager filtering (mocked API)', () => {
  test('loads profiles via mocked API and displays profile cards', async () => {
    const mockProfiles = [
      { id: 'p1', username: 'AquaKnight', rank: 'Gold', wagerEth: 0.25 },
      { id: 'p2', username: 'StormRider', rank: 'Diamond', wagerEth: 0.75 },
    ];
    mockFetchProfilesOnce({ profiles: mockProfiles });

    render(<App />);

    // Wait for cards to render; cards are article elements with aria-label "<username> profile card"
    await waitFor(() => {
      expect(screen.getByLabelText('Profile list')).toBeInTheDocument();
    });

    // Assert both mocked profiles appear
    const grid = screen.getByLabelText('Profile list');
    const cards = within(grid).getAllByRole('article');
    expect(cards.length).toBe(2);

    expect(within(cards[0]).getByText(/AquaKnight/i)).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Gold/i)).toBeInTheDocument();
    expect(within(cards[0]).getByText(/0\.25 ETH/i)).toBeInTheDocument();

    expect(within(cards[1]).getByText(/StormRider/i)).toBeInTheDocument();
    expect(within(cards[1]).getByText(/Diamond/i)).toBeInTheDocument();
    expect(within(cards[1]).getByText(/0\.75 ETH/i)).toBeInTheDocument();
  });
});

/**
 * 2) Wallet connect flow: mock window.ethereum and verify WalletStatus reflects connection.
 */
describe('Integration: Ethereum wallet integration (mocked provider)', () => {
  test('connects to wallet and shows connected badge and truncated address', async () => {
    // Arrange: mock profiles fetch so the app renders without backend
    mockFetchProfilesOnce({ profiles: [] });
    // Arrange: mock ethereum provider with a valid checksummed address
    const validAddress = ethers.utils.getAddress('0x1234567890abcdef1234567890abcdef12345678');
    installEthereumMock({
      accounts: [validAddress],
      chainId: '0x5', // Goerli for example
    });

    render(<App />);

    // WalletStatus shows a Connect Wallet button initially
    const connectBtn = await screen.findByRole('button', { name: /connect ethereum wallet/i });
    expect(connectBtn).toBeEnabled();

    // Click connect; our mock will return the provided account
    await userEvent.click(connectBtn);

    // Badge should indicate connected - wait for the state to update
    await waitFor(() => expect(screen.getByText(/Connected/i)).toBeInTheDocument());

    // Address should be truncated; await the address element to appear
    const addrDisplay = await screen.findByTestId('wallet-address');
    expect(addrDisplay.textContent).toMatch(/^0x1234…5678$/);

    // Disconnect should now be available
    const disconnectBtn = screen.getByRole('button', { name: /disconnect ethereum wallet/i });
    expect(disconnectBtn).toBeInTheDocument();
  });

  test('handles user rejection gracefully by showing an error message', async () => {
    mockFetchProfilesOnce({ profiles: [] });
    // Install ethereum that rejects eth_requestAccounts
    const eth = installEthereumMock({ accounts: [] });
    eth.request.mockImplementation(async ({ method }) => {
      if (method === 'eth_requestAccounts') {
        const err = new Error('User rejected');
        err.code = 4001;
        throw err;
      }
      if (method === 'eth_accounts') return [];
      if (method === 'eth_chainId') return '0x1';
      return null;
    });

    render(<App />);

    const connectBtn = await screen.findByRole('button', { name: /connect ethereum wallet/i });
    await userEvent.click(connectBtn);

    // Error is rendered within WalletStatus via role="alert"
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Connection request rejected/i);

    // Remains disconnected state
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });
});

/**
 * TODOs for future expansion:
 * - Mock the escrow flow: simulate clicking "Challenge", opening EscrowModal, "Continue" -> "Confirm Deposit",
 *   and mock ethers.Contract.deposit to resolve with a receipt, then assert success UI state.
 * - Test wager filter presets and custom range adjustments.
 * - Test LinkAccountModal full path with apiLinkAccount mock.
 */
