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

// PUBLIC_INTERFACE
export const selectError = (state) => state.ui?.error || null;
