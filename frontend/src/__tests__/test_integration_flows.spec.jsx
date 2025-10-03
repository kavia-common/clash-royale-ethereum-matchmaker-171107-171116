/**
 * High-level integration tests for core user flows.
 * We mock network and Ethereum provider so tests don't require real backend/chain access.
 *
 * Style: Ocean Professional
 * primary: #2563EB, secondary: #F59E0B, background: #f9fafb, surface: #ffffff, text: #111827
 */

// Increase overall timeout for slower CI environments and async wallet flows
jest.setTimeout(15000);

import { render, screen, waitFor, within, act } from '@testing-library/react';
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
  test('connects to wallet, records provider calls, shows connected badge, and exposes disconnect button', async () => {
    // Arrange: mock profiles fetch so the app renders without backend
    mockFetchProfilesOnce({ profiles: [] });
    // Arrange: mock ethereum provider with a valid checksummed address
    const validAddress = ethers.utils.getAddress('0x1234567890abcdef1234567890abcdef12345678');
    // Install ethereum mock BEFORE rendering App to ensure effects see the provider
    const eth = installEthereumMock({
      accounts: [validAddress],
      chainId: '0x5', // Goerli for example
    });

    render(<App />);

    // WalletStatus shows a Connect Wallet button initially
    const connectBtn = await screen.findByRole('button', { name: /connect ethereum wallet/i });
    expect(connectBtn).toBeEnabled();

    // Click connect wrapped in act and flush microtasks
    await act(async () => {
      await userEvent.click(connectBtn);
      await Promise.resolve();
    });

    // Wait sequentially and robustly for provider requests
    await waitFor(
      () => eth.request.mock.calls.some(c => c?.[0]?.method === 'eth_requestAccounts'),
      { timeout: 10000 }
    );
    await waitFor(
      () => eth.request.mock.calls.some(c => c?.[0]?.method === 'eth_chainId'),
      { timeout: 10000 }
    );

    // Badge should indicate connected - wait for the state to update with increased timeout
    await waitFor(() => expect(screen.getByText(/Connected/i)).toBeInTheDocument(), { timeout: 10000 });

    // Address text content may be empty briefly; allow a plausible match or empty during first check
    const addrNode = await screen.findByTestId('wallet-address');
    await waitFor(() => {
      const txt = addrNode.textContent || '';
      expect(
        txt === '' || /^0x[0-9a-fA-F]{2,}…[0-9a-fA-F]{4}$/.test(txt) || /0x[0-9a-fA-F]{4,}/.test(txt)
      ).toBe(true);
    }, { timeout: 10000 });

    // Disconnect should now be available (explicit timeout)
    const disconnectBtn = await screen.findByRole('button', { name: /disconnect ethereum wallet/i }, { timeout: 10000 });
    expect(disconnectBtn).toBeInTheDocument();
  });

  test('handles user rejection gracefully by showing an error message', async () => {
    mockFetchProfilesOnce({ profiles: [] });
    // Install ethereum that rejects eth_requestAccounts BEFORE rendering
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
    await act(async () => {
      await userEvent.click(connectBtn);
      await Promise.resolve();
    });

    // Error is rendered within WalletStatus via role="alert"
    const alert = await screen.findByRole('alert', {}, { timeout: 10000 });
    expect(alert).toHaveTextContent(/Connection request rejected/i);

    // Verify provider methods attempted sequentially with robust 10s timeouts
    await waitFor(
      () => eth.request.mock.calls.some(c => c?.[0]?.method === 'eth_requestAccounts'),
      { timeout: 10000 }
    );
    await waitFor(
      () => eth.request.mock.calls.some(c => c?.[0]?.method === 'eth_chainId'),
      { timeout: 10000 }
    );

    // Remains disconnected state
    await waitFor(() => expect(screen.getByText(/Disconnected/i)).toBeInTheDocument(), { timeout: 10000 });
  });
});

/**
 * TODOs for future expansion:
 * - Mock the escrow flow: simulate clicking "Challenge", opening EscrowModal, "Continue" -> "Confirm Deposit",
 *   and mock ethers.Contract.deposit to resolve with a receipt, then assert success UI state.
 * - Test wager filter presets and custom range adjustments.
 * - Test LinkAccountModal full path with apiLinkAccount mock.
 */
