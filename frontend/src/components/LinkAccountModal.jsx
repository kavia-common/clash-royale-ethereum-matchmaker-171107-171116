import React, { useEffect, useMemo, useState } from 'react';

/**
 * Ocean Professional theme tokens
 * Keeping tokens local to component for easy reuse and future theming system integration.
 */
const theme = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  success: '#F59E0B',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  overlay: 'rgba(17, 24, 39, 0.5)',
};

/**
 * Utility: Basic Clash Royale tag validation.
 * Valid tags are usually 8–14 characters, uppercase, starting with # and using allowed charset.
 * We'll support input with or without leading # and normalize.
 */
function validateTag(raw) {
  if (!raw) return { valid: false, message: 'Player tag is required.' };
  const normalized = raw.trim().toUpperCase().replace(/^#/,'');
  const allowed = /^[0289PYLQGRJCUV]+$/; // Supercell charset (approximate common allowed characters)
  if (normalized.length < 6 || normalized.length > 14) {
    return { valid: false, message: 'Tag length must be between 6 and 14 characters.' };
  }
  if (!allowed.test(normalized)) {
    return { valid: false, message: 'Tag contains invalid characters.' };
  }
  return { valid: true, tag: `#${normalized}` };
}

/**
 * Utility: Simple token validation (placeholder).
 * Token could be any non-empty string for now; real validation would be server-side.
 */
function validateToken(raw) {
  if (!raw) return { valid: false, message: 'API token is required.' };
  if (raw.trim().length < 8) return { valid: false, message: 'API token is too short.' };
  return { valid: true, token: raw.trim() };
}

/**
 * PUBLIC_INTERFACE
 * LinkAccountModal
 * A controlled modal for linking a Clash Royale account. Accepts open/close flags and handlers.
 */
export default function LinkAccountModal({
  open,
  onClose,
  onSubmit, // optional async function receiving { tag, token }
}) {
  /** This is a public function. */

  const [mode, setMode] = useState('tag'); // 'tag' | 'token'
  const [tag, setTag] = useState('');
  const [token, setToken] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // reset internal state when opening/closing
  useEffect(() => {
    if (!open) {
      setMode('tag');
      setTag('');
      setToken('');
      setTouched(false);
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  const validation = useMemo(() => {
    if (!touched) return { valid: false, message: '' };
    if (mode === 'tag') return validateTag(tag);
    return validateToken(token);
  }, [mode, tag, token, touched]);

  const [canSubmit, setCanSubmit] = useState(false);

  // Recompute canSubmit after relevant state changes, allowing React to settle between events (e.g., blur)
  useEffect(() => {
    const next = touched && validation.valid && !submitting;
    setCanSubmit(Boolean(next));
  }, [touched, validation, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setError('');

    const result = mode === 'tag' ? validateTag(tag) : validateToken(token);
    if (!result.valid) {
      setError(result.message || 'Please correct the input.');
      return;
    }

    setSubmitting(true);
    try {
      // Placeholder API call. In future, replace with real backend POST.
      // Example:
      // const res = await fetch(`${process.env.REACT_APP_API_URL}/link-account`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ tag: result.tag, token: token || undefined }),
      // });
      // Handle real response.

      if (typeof onSubmit === 'function') {
        await onSubmit({
          tag: result.tag || undefined,
          token: mode === 'token' ? result.token : undefined,
          mode,
        });
      } else {
        // Stubbed latency to simulate request
        await new Promise((r) => setTimeout(r, 600));
      }

      onClose?.();
    } catch (err) {
      setError(
        err?.message || 'Unexpected error while linking account. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
      aria-describedby="link-modal-desc"
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 id="link-modal-title" style={styles.title}>
            Link Clash Royale Account
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            style={styles.iconButton}
          >
            ×
          </button>
        </div>
        <p id="link-modal-desc" style={styles.subtitle}>
          Provide your Clash Royale player tag or API token to link your account. You can switch modes below.
        </p>

        <div style={styles.segmentControl} role="tablist" aria-label="Input mode">
          <button
            role="tab"
            aria-selected={mode === 'tag'}
            onClick={() => { setMode('tag'); setTouched(false); setError(''); }}
            style={{
              ...styles.segmentButton,
              ...(mode === 'tag' ? styles.segmentButtonActive : {}),
            }}
          >
            By Player Tag
          </button>
          <button
            role="tab"
            aria-selected={mode === 'token'}
            onClick={() => { setMode('token'); setTouched(false); setError(''); }}
            style={{
              ...styles.segmentButton,
              ...(mode === 'token' ? styles.segmentButtonActive : {}),
            }}
          >
            By API Token
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'tag' ? (
            <div style={styles.fieldGroup}>
              <label htmlFor="player-tag" style={styles.label}>Player Tag</label>
              <input
                id="player-tag"
                name="playerTag"
                placeholder="#ABC123"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onBlur={() => setTouched(true)}
                style={{
                  ...styles.input,
                  ...(touched && !validateTag(tag).valid ? styles.inputError : {}),
                }}
                aria-invalid={touched && !validateTag(tag).valid}
                aria-describedby="player-tag-help"
              />
              <div id="player-tag-help" style={styles.helpText}>
                Find your tag in-game; include or omit the leading # (we’ll normalize it).
              </div>
            </div>
          ) : (
            <div style={styles.fieldGroup}>
              <label htmlFor="api-token" style={styles.label}>API Token</label>
              <input
                id="api-token"
                name="apiToken"
                placeholder="Enter your API token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onBlur={() => setTouched(true)}
                style={{
                  ...styles.input,
                  ...(touched && !validateToken(token).valid ? styles.inputError : {}),
                }}
                aria-invalid={touched && !validateToken(token).valid}
                aria-describedby="api-token-help"
              />
              <div id="api-token-help" style={styles.helpText}>
                Keep this token private. It will be sent securely to the server.
              </div>
            </div>
          )}

          {error && (
            <div role="alert" style={styles.errorBanner}>
              {error}
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.secondaryButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...styles.primaryButton,
                ...(canSubmit ? {} : styles.primaryButtonDisabled),
              }}
              aria-disabled={!canSubmit}
            >
              {submitting ? 'Linking…' : 'Link Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: theme.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    background: theme.surface,
    color: theme.text,
    borderRadius: 12,
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    padding: 20,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: theme.text,
  },
  subtitle: {
    margin: '0 0 16px',
    color: '#374151',
    fontSize: 14,
  },
  iconButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
    color: '#6B7280',
  },
  segmentControl: {
    display: 'inline-flex',
    background: theme.background,
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  segmentButton: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid transparent',
    background: 'transparent',
    color: theme.text,
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  segmentButtonActive: {
    background: '#EEF2FF',
    borderColor: theme.primary,
    color: theme.primary,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    outline: 'none',
    fontSize: 14,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
  },
  inputError: {
    borderColor: theme.error,
    boxShadow: '0 0 0 3px rgba(239,68,68,0.1)',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorBanner: {
    marginTop: 8,
    marginBottom: 8,
    padding: '10px 12px',
    borderRadius: 10,
    background: '#FEF2F2',
    color: theme.error,
    border: `1px solid ${theme.error}33`,
    fontSize: 14,
  },
  actions: {
    marginTop: 16,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  secondaryButton: {
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #E5E7EB',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  primaryButton: {
    background: theme.primary,
    color: '#ffffff',
    border: '1px solid transparent',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
    transition: 'transform 0.1s ease',
  },
  primaryButtonDisabled: {
    filter: 'grayscale(0.3)',
    opacity: 0.7,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};
