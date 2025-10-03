import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock fetch for profiles to avoid real network
function mockFetchProfiles(profiles = []) {
  global.fetch = jest.fn((url, init) => {
    if (String(url).includes('/profiles') && (!init || init.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => profiles,
        text: async () => JSON.stringify(profiles),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    });
  });
}

afterEach(() => {
  jest.resetAllMocks();
});

describe('App integration', () => {
  test('renders header, toggles theme, opens Link Account modal, and shows profiles', async () => {
    const profiles = [
      { id: 'p1', username: 'AquaKnight', rank: 'Gold', wagerEth: 0.25 },
      { id: 'p2', username: 'StormRider', rank: 'Diamond', wagerEth: 0.75 },
    ];
    mockFetchProfiles(profiles);

    render(<App />);

    // Header content
    expect(screen.getByText(/CR Matchmaker/i)).toBeInTheDocument();

    // Theme starts as light
    expect(screen.getByText(/Theme:/i)).toBeInTheDocument();
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');

    // Toggle to dark
    await userEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');

    // Open link account modal
    await userEvent.click(screen.getByRole('button', { name: /link clash royale account/i }));
    expect(screen.getByRole('dialog', { name: /link clash royale account/i })).toBeInTheDocument();

    // Close modal via close button
    await userEvent.click(screen.getByRole('button', { name: /close modal/i }));
    await waitFor(() => {
      // dialog removed
      expect(screen.queryByRole('dialog', { name: /link clash royale account/i })).not.toBeInTheDocument();
    });

    // Profiles loaded
    await waitFor(() => expect(screen.getByLabelText('Profile list')).toBeInTheDocument());
    const grid = screen.getByLabelText('Profile list');
    const cards = grid.querySelectorAll('article');
    expect(cards.length).toBe(2);
  });
});
