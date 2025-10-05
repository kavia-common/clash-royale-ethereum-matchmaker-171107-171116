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
      // actions.setProfiles(payloadArray) => { type: 'PROFILES_SET', payload: items }
      return { ...state, profiles: Array.isArray(action.payload) ? action.payload : [] };

    case types.SET_WAGERS:
      // actions.setWagersLive(payloadArray) => { type: 'WAGERS_LIVE_SET', payload: items }
      return { ...state, wagers: Array.isArray(action.payload) ? action.payload : [] };

    case types.ADD_WAGER:
      // Not actively used; keep for forward-compat
      return { ...state, wagers: action.wager ? [action.wager, ...(state.wagers || [])] : state.wagers };

    case types.SET_HISTORY:
      // actions.setWagersHistory(payloadArray) => { type: 'WAGERS_HISTORY_SET', payload: items }
      return { ...state, history: Array.isArray(action.payload) ? action.payload : [] };

    case types.SET_LOADING:
      // actions.setSliceLoading(slice, loading) => payload { slice, loading }
      return { ...state, ui: { ...state.ui, loading: !!(action.payload && action.payload.loading) } };

    case types.SET_ERROR:
      // actions.setSliceError(slice, error) => payload { slice, error }
      return { ...state, ui: { ...state.ui, error: action.payload ? action.payload.error || null : null } };

    default:
      return state;
  }
}
