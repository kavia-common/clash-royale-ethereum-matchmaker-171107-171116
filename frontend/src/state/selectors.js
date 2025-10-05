//
//
// state/selectors.js
//
// PUBLIC_INTERFACE
// Selector helpers for accessing app state.
//

// PUBLIC_INTERFACE
export const selectProfiles = (state) => state.profiles || [];

// PUBLIC_INTERFACE
export const selectWagers = (state) => state.wagers || [];

// PUBLIC_INTERFACE
export const selectHistory = (state) => state.history || [];

// PUBLIC_INTERFACE
export const selectLoading = (state) => state.ui?.loading || false;

/**
 * PUBLIC_INTERFACE
 * Optional selector used by some components/tests to read the authenticated wallet address.
 * If auth slice is absent, it falls back to the wallet info on ui or returns null.
 */
export const selectError = (state) => state.ui?.error || null;

// PUBLIC_INTERFACE
export const selectAuthWallet = (state) =>
  state.auth?.address || state.wallet?.address || state.ui?.account || null;

// Clash Royale account selectors

// PUBLIC_INTERFACE
export const selectCrAccount = (state) => state.crAccount || { linked: false, profile: null };

// PUBLIC_INTERFACE
export const selectCrAccountLoading = (state) => state.crAccount?.loading || false;

// PUBLIC_INTERFACE
export const selectCrAccountError = (state) => state.crAccount?.error || null;

// PUBLIC_INTERFACE
export const selectCRLinked = (state) => !!state.crAccount?.linked;

// PUBLIC_INTERFACE
export const selectCRProfile = (state) => state.crAccount?.profile || null;
