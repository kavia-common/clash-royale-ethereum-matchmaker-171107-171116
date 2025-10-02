/**
 * Test utilities for rendering with theme awareness.
 * This is a test-only helper to keep tests clean and consistent with the Ocean Professional theme.
 *
 * Note: We avoid adding external dependencies; this is a minimal wrapper.
 */

import { render } from '@testing-library/react';

// PUBLIC_INTERFACE
export function renderWithLightTheme(ui, options = {}) {
  /** Render with light theme by setting data-theme attribute on documentElement. */
  document.documentElement.setAttribute('data-theme', 'light');
  return render(ui, options);
}

// PUBLIC_INTERFACE
export function renderWithDarkTheme(ui, options = {}) {
  /** Render with dark theme by setting data-theme attribute on documentElement. */
  document.documentElement.setAttribute('data-theme', 'dark');
  return render(ui, options);
}
