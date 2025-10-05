//
// state/store.js
//
// PUBLIC_INTERFACE
// Minimal store implementation compatible with React without external deps to keep CI light.
// Provides createStore-like API and a React context provider.
//
// If the project already uses Redux, this can be swapped with configureStore easily.
//

import React, { createContext, useContext, useMemo, useReducer } from "react";
import { rootReducer } from "./reducers";

const StoreContext = createContext(null);

// PUBLIC_INTERFACE
export function StoreProvider({ children, initialState }) {
  // Ensure we have a proper initial state even when no initialState prop is provided.
  // useReducer does not call the reducer for default param when initialArg is undefined,
  // so we compute the baseline state via a lazy initializer.
  const init = (initArg) => {
    return initArg !== undefined ? initArg : rootReducer(undefined, { type: "@@INIT" });
  };
  const [state, dispatch] = useReducer(rootReducer, initialState, init);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// PUBLIC_INTERFACE
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// PUBLIC_INTERFACE
// Compatibility hooks for code/tests expecting Redux-style hooks.
export function useAppDispatch() {
  const { dispatch } = useStore();
  return dispatch;
}

// PUBLIC_INTERFACE
export function useAppSelector(selectorFn) {
  const { state } = useStore();
  return selectorFn ? selectorFn(state) : state;
}
