import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App component', () => {
  test('shows initial light theme and toggles to dark on click', () => {
    render(<App />);

    // Theme indicator text uses "Theme:" and theme value has data-testid="theme-value"
    expect(screen.getByText(/Theme:/i)).toBeInTheDocument();
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');

    // Button aria-label reflects the target mode and text reflects the theme icon
    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveClass('theme-toggle');
    expect(toggleBtn).toHaveTextContent(/Dark/i);

    // Root initially light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click to toggle
    fireEvent.click(toggleBtn);

    // Now dark theme applied
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Aria label updates to offer switching back to light
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();

    // Text indicator updates
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
  });

  test('applies CSS variable driven colors consistent with theme', () => {
    render(<App />);

    // App root exists
    const appRoot = document.querySelector('.App');
    expect(appRoot).toBeInTheDocument();

    // Since JSDOM does not compute CSS variables, we assert the data-theme prop changes
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(toggleBtn);

    // Ensure the theme attribute switches, which will trigger variable changes in the browser
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // And the indicator updates
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
  });

  test('has accessible theme toggle button with clear label describing action', () => {
    render(<App />);
    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggleBtn).toBeEnabled();
    expect(toggleBtn).toHaveAttribute('aria-label');
  });
});
