import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletStatus from '../components/WalletStatus';
import { ethers } from 'ethers';

// Helper to install an ethereum mock
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

afterEach(() => {
  jest.resetAllMocks();
  delete window.ethereum;
});

describe('WalletStatus', () => {
  test('renders disconnected, connects, shows truncated address, and can disconnect', async () => {
    installEthereumMock();

    render(<WalletStatus />);

    // Initially shows Disconnected badge and Connect button
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    const connectBtn = screen.getByRole('button', { name: /connect ethereum wallet/i });
    expect(connectBtn).toBeEnabled();

    // Connect wallet
    await userEvent.click(connectBtn);

    // Badge indicates connected
    await waitFor(() => expect(screen.getByText(/Connected/i)).toBeInTheDocument());

    // Truncated address rendered into data-testid wallet-address
    const addr = await screen.findByTestId('wallet-address');
    expect(addr.textContent).toMatch(/^0x1234…5678$/);

    // Disconnect path visible
    const disconnectBtn = screen.getByRole('button', { name: /disconnect ethereum wallet/i });
    await userEvent.click(disconnectBtn);

    // Back to disconnected state
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });

  test('handles user rejection with an error alert and remains disconnected', async () => {
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

    render(<WalletStatus />);

    const connectBtn = screen.getByRole('button', { name: /connect ethereum wallet/i });
    await userEvent.click(connectBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Connection request rejected/i);

    // Still disconnected
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });
});
