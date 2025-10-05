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

// Placeholder exports to flesh out later steps
/**
 * PUBLIC_INTERFACE
 * selectCrAccount
 * @param {any} state
 */
export const selectCrAccount = (state) => state?.crAccount?.data || null;
