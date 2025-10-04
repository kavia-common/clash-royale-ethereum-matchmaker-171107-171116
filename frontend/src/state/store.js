import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { rootReducer, initialState as defaultInitialState } from './reducers';

/**
 * StoreContext holds the global state and dispatch from useReducer.
 * Slices:
 * - authSession: { wallet: { address, chainId, isConnected, connecting, error } }
 * - crAccount: { data, loading, error }
 * - profiles: { items, loading, error }
 * - wagers: { live, history, loading, error }
 * - escrow: { config, statusByWager, loading, error }
 */
const StoreContext = createContext(null);

/**
 * PUBLIC_INTERFACE
 * StoreProvider
 * Wraps the app with a global reducer store.
 * @param {{ children: React.ReactNode, initialState?: any }} props
 */
export function StoreProvider({ children, initialState }) {
  /** This is a public function. */
  const [state, dispatch] = useReducer(rootReducer, initialState || defaultInitialState);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/**
 * PUBLIC_INTERFACE
 * useStore
 * Access raw { state, dispatch } context. Returns a safe no-op fallback if provider is missing.
 */
export function useStore() {
  /** This is a public function. */
  const ctx = useContext(StoreContext);
  if (!ctx) {
    // Safe fallback to ease isolated component testing without wrapping a provider
    return {
      state: defaultInitialState,
      dispatch: () => {},
    };
  }
  return ctx;
}

/**
 * PUBLIC_INTERFACE
 * useAppDispatch
 * Returns the dispatch function from the Store, or a no-op if missing provider.
 */
export function useAppDispatch() {
  /** This is a public function. */
  const ctx = useContext(StoreContext);
  return ctx?.dispatch || (() => {});
}

/**
 * PUBLIC_INTERFACE
 * useAppSelector
 * Select part of the state using a selector. If no selector provided, returns entire state.
 * @param {(state: any) => any} [selector]
 */
export function useAppSelector(selector) {
  /** This is a public function. */
  const { state } = useStore();
  return selector ? selector(state) : state;
}

export default StoreProvider;
