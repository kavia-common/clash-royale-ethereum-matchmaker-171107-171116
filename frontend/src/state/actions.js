//
// Action creators for global store
//

/**
 * PUBLIC_INTERFACE
 * setAuthWallet
 * Update wallet/auth state
 * @param {{address?: string, chainId?: string, isConnected?: boolean, connecting?: boolean, error?: string, verified?: boolean, networkName?: string}} payload
 */
export const setAuthWallet = (payload) => ({
  /** This is a public function. */
  type: 'AUTH_WALLET_UPDATED',
  payload,
});

/**
 * PUBLIC_INTERFACE
 * setSliceLoading
 * @param {'authSession'|'profiles'|'wagers'|'escrow'|'crAccount'} slice
 * @param {boolean} loading
 */
export const setSliceLoading = (slice, loading) => ({
  /** This is a public function. */
  type: 'SLICE_LOADING_SET',
  payload: { slice, loading },
});

/**
 * PUBLIC_INTERFACE
 * setSliceError
 * @param {'authSession'|'profiles'|'wagers'|'escrow'|'crAccount'} slice
 * @param {string} error
 */
export const setSliceError = (slice, error) => ({
  /** This is a public function. */
  type: 'SLICE_ERROR_SET',
  payload: { slice, error },
});

/**
 * PUBLIC_INTERFACE
 * setProfiles
 * @param {Array} items
 */
export const setProfiles = (items) => ({
  /** This is a public function. */
  type: 'PROFILES_SET',
  payload: items,
});

/**
 * PUBLIC_INTERFACE
 * setWagersLive
 * @param {Array} items
 */
export const setWagersLive = (items) => ({
  /** This is a public function. */
  type: 'WAGERS_LIVE_SET',
  payload: items,
});

/**
 * PUBLIC_INTERFACE
 * setWagersHistory
 * @param {Array} items
 */
export const setWagersHistory = (items) => ({
  /** This is a public function. */
  type: 'WAGERS_HISTORY_SET',
  payload: items,
});

/**
 * PUBLIC_INTERFACE
 * setEscrowConfig
 * @param {any} config
 */
export const setEscrowConfig = (config) => ({
  /** This is a public function. */
  type: 'ESCROW_CONFIG_SET',
  payload: config,
});

/**
 * PUBLIC_INTERFACE
 * updateEscrowStatus
 * @param {{wagerId: string|number, status: any}} payload
 */
export const updateEscrowStatus = (payload) => ({
  /** This is a public function. */
  type: 'ESCROW_STATUS_UPDATE',
  payload,
});
