import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EscrowModal from '../components/EscrowModal';

// Minimal wallet hook mock: we mock the module to control wallet state in tests
jest.mock('../hooks/useEthereumWallet', () => {
  const actual = jest.requireActual('../hooks/useEthereumWallet');
  return {
    ...actual,
    useEthereumWallet: () => ({
      isConnected: mockState.isConnected,
      address: mockState.address,
      connect: mockHandlers.connect,
      theme: { primary: '#2563EB', error: '#EF4444', text: '#111827' },
    }),
    truncateAddress: actual.truncateAddress,
  };
});

let mockState;
const mockHandlers = {
  connect: jest.fn(),
};

beforeEach(() => {
  mockState = { isConnected: false, address: '' };
  mockHandlers.connect.mockClear();
});

describe('EscrowModal', () => {
  test('requires wallet connection on review step and shows warning', async () => {
    render(
      <EscrowModal
        open={true}
        onClose={() => {}}
        challenger={null}
        opponent={{ id: 'p1', username: 'AquaKnight', rank: 'Gold', wagerEth: 0.25 }}
        defaultWager={0.25}
      />
    );

    // Warning alert shown
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/must connect your Ethereum wallet/i);

    // Connect wallet button visible in review step
    const connectBtn = screen.getByRole('button', { name: /connect ethereum wallet/i });
    await userEvent.click(connectBtn);
    expect(mockHandlers.connect).toHaveBeenCalled();
  });

  test('flows review -> confirm -> pending -> success with provided handlers', async () => {
    mockState.isConnected = true;
    mockState.address = '0x000000000000000000000000000000000000dEaD';

    const onInitiate = jest.fn().mockResolvedValue({ matchId: 42 });
    const onDeposit = jest.fn().mockResolvedValue({ txHash: '0xabc123' });
    const onComplete = jest.fn();

    render(
      <EscrowModal
        open={true}
        onClose={() => {}}
        challenger={null}
        opponent={{ id: 'p2', username: 'StormRider', rank: 'Diamond', wagerEth: 0.75 }}
        defaultWager={0.75}
        onInitiate={onInitiate}
        onDeposit={onDeposit}
        onComplete={onComplete}
      />
    );

    // Continue from review
    const continueBtn = await screen.findByRole('button', { name: /continue/i });
    await userEvent.click(continueBtn);
    expect(onInitiate).toHaveBeenCalledWith({ opponentId: 'p2', wagerEth: 0.75 });

    // Confirm Deposit
    const confirmBtn = await screen.findByRole('button', { name: /confirm deposit/i });
    await userEvent.click(confirmBtn);

    // Pending -> Success
    await waitFor(() => expect(onDeposit).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/deposit confirmed/i)).toBeInTheDocument());

    // Tx hash snippet shown
    expect(screen.getByText(/Tx:/i)).toBeInTheDocument();

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });
});
