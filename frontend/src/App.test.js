import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App component', () => {
  test('renders learn react link', () => {
    render(<App />);
    const linkElement = screen.getByText(/learn react/i);
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveClass('App-link');
    expect(linkElement).toHaveAttribute('href', 'https://reactjs.org');
  });

  test('shows initial light theme and toggles to dark on click', () => {
    render(<App />);

    // Theme indicator text
    expect(screen.getByText(/Current theme:/i)).toBeInTheDocument();
    expect(screen.getByText(/Current theme:/i).nextSibling).toHaveTextContent('light');

    // Button aria-label reflects the target mode and text reflects the theme icon
    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveClass('theme-toggle');
    expect(toggleBtn).toHaveTextContent('Dark');

    // Root initially light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click to toggle
    fireEvent.click(toggleBtn);

    // Now dark theme applied
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Aria label updates to offer switching back to light
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();

    // Text indicator updates
    expect(screen.getByText(/Current theme:/i).nextSibling).toHaveTextContent('dark');
  });

  test('applies CSS variable driven colors consistent with theme', () => {
    render(<App />);

    // In light theme, App element should use --bg-primary and --text-primary.
    const appRoot = document.querySelector('.App');
    expect(appRoot).toBeInTheDocument();

    // Since JSDOM does not compute CSS variables, we assert the data-theme prop changes
    // and classes remain consistent. This ensures visual mode switching is wired correctly.
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(toggleBtn);

    // Ensure the theme attribute switches, which will trigger variable changes in the browser
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('has accessible button with clear label describing action', () => {
    render(<App />);
    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggleBtn).toBeEnabled();
    expect(toggleBtn).toHaveAttribute('aria-label');
  });
});
