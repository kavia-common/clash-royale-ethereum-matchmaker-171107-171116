//
// Selectors for global store
//

/**
 * PUBLIC_INTERFACE
 * selectAuthWallet
 * @param {any} state
 */
export const selectAuthWallet = (state) => state?.authSession?.wallet || {};

/**
 * PUBLIC_INTERFACE
 * selectIsWalletConnected
 * @param {any} state
 */
export const selectIsWalletConnected = (state) => !!(state?.authSession?.wallet?.isConnected);

/**
 * PUBLIC_INTERFACE
 * selectProfiles
 * @param {any} state
 */
export const selectProfiles = (state) => state?.profiles?.items || [];

/**
 * PUBLIC_INTERFACE
 * selectWagersLive
 * @param {any} state
 */
export const selectWagersLive = (state) => state?.wagers?.live || [];

/**
 * PUBLIC_INTERFACE
 * selectWagersHistory
 * @param {any} state
 */
export const selectWagersHistory = (state) => state?.wagers?.history || [];

/**
 * PUBLIC_INTERFACE
 * selectEscrowConfig
 * @param {any} state
 */
export const selectEscrowConfig = (state) => state?.escrow?.config || null;

/**
 * PUBLIC_INTERFACE
 * selectEscrowDepositByWager
 * @param {any} state
 * @param {string|number} wagerId
 */
export const selectEscrowDepositByWager = (state, wagerId) =>
  (state?.escrow?.deposits && state.escrow.deposits[wagerId]) || null;

// Placeholder exports to flesh out later steps
/**
 * PUBLIC_INTERFACE
 * selectCrAccount
 * @param {any} state
 */
export const selectCrAccount = (state) => state?.crAccount?.data || null;

/**
 * PUBLIC_INTERFACE
 * selectCrAccountLoading
 * @param {any} state
 */
export const selectCrAccountLoading = (state) => !!(state?.crAccount?.loading);

/**
 * PUBLIC_INTERFACE
 * selectCrAccountError
 * @param {any} state
 */
export const selectCrAccountError = (state) => state?.crAccount?.error || '';

/**
 * PUBLIC_INTERFACE
 * selectWagerFilter
 * @param {any} state
 */
export const selectWagerFilter = (state) => state?.filters?.wager || { min: 0.01, max: 5.0 };

/**
 * PUBLIC_INTERFACE
 * selectIsWalletVerified
 * @param {any} state
 */
export const selectIsWalletVerified = (state) => !!(state?.authSession?.wallet?.verified);
