const sliceDefault = (data) => ({
  data: data ?? null,
  loading: false,
  error: '',
});

export const initialState = {
  authSession: {
    // Wallet/auth status and future session token, user info, etc.
    wallet: {
      address: '',
      chainId: '',
      isConnected: false,
      connecting: false,
      error: '',
      verified: false,
      networkName: '',
    },
    user: null,
    loading: false,
    error: '',
  },
  crAccount: sliceDefault(null),
  profiles: {
    items: [],
    loading: false,
    error: '',
  },
  wagers: {
    live: [],
    history: [],
    loading: false,
    error: '',
  },
  escrow: {
    config: null,
    statusByWager: {}, // { [wagerId]: status }
    loading: false,
    error: '',
  },
};

function setSliceLoading(state, slice, loading) {
  if (!state[slice]) return state;
  return {
    ...state,
    [slice]: {
      ...state[slice],
      loading: !!loading,
      // Do not clear existing error automatically on loading toggle
    },
  };
}

function setSliceError(state, slice, error) {
  if (!state[slice]) return state;
  return {
    ...state,
    [slice]: {
      ...state[slice],
      error: error || '',
      loading: false,
    },
  };
}

export function rootReducer(state = initialState, action) {
  const { type, payload } = action || {};
  switch (type) {
    // Auth / Wallet
    case 'AUTH_WALLET_UPDATED': {
      const nextWallet = {
        address: payload?.address || '',
        chainId: payload?.chainId || '',
        isConnected: !!payload?.isConnected,
        connecting: !!payload?.connecting,
        error: payload?.error || '',
        verified: !!payload?.verified,
        networkName: payload?.networkName || '',
      };
      return {
        ...state,
        authSession: {
          ...state.authSession,
          wallet: nextWallet,
        },
      };
    }
    case 'AUTH_SESSION_SET_USER': {
      return {
        ...state,
        authSession: {
          ...state.authSession,
          user: payload || null,
        },
      };
    }
    case 'SLICE_LOADING_SET': {
      return setSliceLoading(state, payload?.slice, payload?.loading);
    }
    case 'SLICE_ERROR_SET': {
      return setSliceError(state, payload?.slice, payload?.error);
    }

    // Profiles
    case 'PROFILES_SET': {
      return {
        ...state,
        profiles: {
          ...state.profiles,
          items: Array.isArray(payload) ? payload : [],
          loading: false,
          error: '',
        },
      };
    }

    // Wagers
    case 'WAGERS_LIVE_SET': {
      return {
        ...state,
        wagers: {
          ...state.wagers,
          live: Array.isArray(payload) ? payload : [],
          loading: false,
          error: '',
        },
      };
    }
    case 'WAGERS_HISTORY_SET': {
      return {
        ...state,
        wagers: {
          ...state.wagers,
          history: Array.isArray(payload) ? payload : [],
          loading: false,
          error: '',
        },
      };
    }

    // Escrow
    case 'ESCROW_CONFIG_SET': {
      return {
        ...state,
        escrow: {
          ...state.escrow,
          config: payload || null,
          loading: false,
          error: '',
        },
      };
    }
    case 'ESCROW_STATUS_UPDATE': {
      const { wagerId, status } = payload || {};
      if (!wagerId) return state;
      return {
        ...state,
        escrow: {
          ...state.escrow,
          statusByWager: {
            ...(state.escrow?.statusByWager || {}),
            [wagerId]: status,
          },
        },
      };
    }

    default:
      return state;
  }
}

export default rootReducer;
