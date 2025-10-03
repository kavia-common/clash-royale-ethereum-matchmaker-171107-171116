import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileList from '../components/ProfileList';

const profiles = [
  { id: 'p1', username: 'AquaKnight', rank: 'Gold', wagerEth: 0.25 },
  { id: 'p2', username: 'StormRider', rank: 'Diamond', wagerEth: 0.75 },
  { id: 'p3', username: 'LowRoll', rank: 'Bronze', wagerEth: 0.05 },
];

describe('ProfileList', () => {
  test('renders profiles provided via props and respects filter', () => {
    const { rerender } = render(<ProfileList profiles={profiles} filter={{ min: 0.2, max: 1.0 }} />);

    const grid = screen.getByLabelText('Profile list');
    let cards = within(grid).getAllByRole('article');
    expect(cards.length).toBe(2); // p1 and p2

    // Adjust filter to hide p1 and p2, show only p3
    rerender(<ProfileList profiles={profiles} filter={{ min: 0.01, max: 0.06 }} />);
    const section = screen.getByLabelText('Profile list');
    cards = within(section).getAllByRole('article');
    expect(cards.length).toBe(1);
    expect(within(cards[0]).getByText(/LowRoll/i)).toBeInTheDocument();
  });

  test('clicking Challenge opens EscrowModal with opponent details', async () => {
    render(<ProfileList profiles={profiles} filter={{ min: 0.01, max: 1.0 }} />);

    const grid = screen.getByLabelText('Profile list');
    const cards = within(grid).getAllByRole('article');
    const firstChallenge = within(cards[0]).getByRole('button', { name: /challenge/i });

    await userEvent.click(firstChallenge);

    // Modal is open with dialog role and title
    const dialog = await screen.findByRole('dialog', { name: /initiate match & deposit escrow/i });
    expect(dialog).toBeInTheDocument();

    // Opponent shown
    expect(screen.getByText(/opponent/i)).toBeInTheDocument();
    expect(screen.getByText(/AquaKnight/i)).toBeInTheDocument();
  });
});
