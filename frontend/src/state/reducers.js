//
// state/reducers.js
//
// PUBLIC_INTERFACE
// Root reducer combining profiles, wagers, history, and ui slices.
//

import { types } from "./actions";

const initial = {
  profiles: [],
  wagers: [],
  history: [],
  ui: { loading: false, error: null },
};

// PUBLIC_INTERFACE
export function rootReducer(state = initial, action) {
  switch (action.type) {
    case types.SET_PROFILES:
      return { ...state, profiles: action.profiles || [] };
    case types.SET_WAGERS:
      return { ...state, wagers: action.wagers || [] };
    case types.ADD_WAGER:
      return { ...state, wagers: [action.wager, ...state.wagers] };
    case types.SET_HISTORY:
      return { ...state, history: action.history || [] };
    case types.SET_LOADING:
      return { ...state, ui: { ...state.ui, loading: !!action.loading } };
    case types.SET_ERROR:
      return { ...state, ui: { ...state.ui, error: action.error || null } };
    default:
      return state;
  }
}
