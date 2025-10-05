import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiCRLink, apiGetCRMe, apiCRUnlink } from '../services/api';
import { useAppDispatch, useAppSelector } from '../state/store';
import { setSliceError, setSliceLoading, setCrAccountData } from '../state/actions';
import { selectCRLinked, selectCRProfile } from '../state/selectors';
import { Banner } from './ui';
import InlineError from './ui/InlineError';

/**
 * Ocean Professional theme tokens mapped to CSS variables
 */
const theme = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  background: 'var(--bg)',
  surface: 'var(--surface)',
  text: 'var(--text)',
  overlay: 'rgba(17, 24, 39, 0.5)',
};

/**
 * Utility: Basic Clash Royale tag validation.
 * Valid inputs: /^[#]?[A-Z0-9]{3,14}$/
 * Normalize to uppercase with a leading '#'
 */
function validateTag(raw) {
  if (!raw) return { valid: false, message: 'Player tag is required.' };
  const normalized = String(raw).trim().toUpperCase().replace(/\s+/g, '').replace(/^#/, '');
  if (!/^[A-Z0-9]{3,14}$/.test(normalized)) {
    return { valid: false, message: 'Enter 3–14 letters/numbers. # is optional.' };
  }
  return { valid: true, tag: `#${normalized}` };
}

/**
 * Utility: Simple token validation.
 */
function validateToken(raw) {
  if (!raw) return { valid: false, message: 'API token is required.' };
  if (String(raw).trim().length < 8) return { valid: false, message: 'API token is too short.' };
  return { valid: true, token: String(raw).trim() };
}

/**
 * PUBLIC_INTERFACE
 * LinkAccountModal
 * Single modal with two inputs: Player Tag (default) or API Token.
 * Validates in real-time; handles link/unlink and provides success/error banners.
 */
export default function LinkAccountModal({
  open,
  onClose,
  onSubmit, // optional async function receiving { tag, token, mode }
  onLinked, // optional callback after successful link and refresh
}) {
  /** This is a public function. */

  const [mode, setMode] = useState('tag'); // 'tag' | 'token'
  const [tag, setTag] = useState('');
  const [token, setToken] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const dispatch = useAppDispatch();
  const linked = useAppSelector(selectCRLinked);
  const crProfile = useAppSelector(selectCRProfile);

  const firstFieldRef = useRef(null);

  // reset internal state when opening/closing
  useEffect(() => {
    if (!open) {
      setMode('tag');
      setTag('');
      setToken('');
      setTouched(false);
      setSubmitting(false);
      setError('');
      setSuccess('');
    }
  }, [open]);

  // keyboard ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Autofocus first field
  useEffect(() => {
    if (open && firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
  }, [open, mode]);

  const currentValidation = useMemo(() => {
    if (!touched) return { valid: false, message: '' };
    if (mode === 'tag') return validateTag(tag);
    return validateToken(token);
  }, [mode, tag, token, touched]);

  const canSubmit = touched && currentValidation.valid && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setSuccess('');
    setError('');

    const result = mode === 'tag' ? validateTag(tag) : validateToken(token);
    if (!result.valid) {
      setError(result.message || 'Please correct the input.');
      return;
    }

    setSubmitting(true);
    try {
      if (typeof onSubmit === 'function') {
        await onSubmit({
          tag: result.tag || undefined,
          token: mode === 'token' ? result.token : undefined,
          mode,
        });
        onClose?.();
        return;
      }

      dispatch(setSliceLoading('crAccount', true));
      // Perform link via API
      await apiCRLink({
        tag: result.tag || undefined,
        token: mode === 'token' ? result.token : undefined,
      });

      // Refresh linked profile
      const me = await apiGetCRMe();
      dispatch(setCrAccountData(me));

      // Success feedback
      setSuccess('Account linked successfully.');
      setError('');
      try {
        // eslint-disable-next-line no-unused-expressions
        window?.dispatchEvent && window.dispatchEvent(new CustomEvent('cr-link-success'));
      } catch {}
      onLinked?.(me);

      // brief delay then close
      setTimeout(() => onClose?.(), 500);
    } catch (err) {
      const msg = err?.message || 'Unexpected error while linking account. Please try again.';
      setError(msg);
      dispatch(setSliceError('crAccount', msg));
    } finally {
      setSubmitting(false);
      dispatch(setSliceLoading('crAccount', false));
    }
  };

  const handleUnlink = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      dispatch(setSliceLoading('crAccount', true));
      await apiCRUnlink();
      const me = await apiGetCRMe();
      dispatch(setCrAccountData(me));
      setSuccess('Unlinked successfully.');
      setTimeout(() => onClose?.(), 400);
    } catch (err) {
      const msg = err?.message || 'Failed to unlink. Please try again.';
      setError(msg);
      dispatch(setSliceError('crAccount', msg));
    } finally {
      setSubmitting(false);
      dispatch(setSliceLoading('crAccount', false));
    }
  };

  if (!open) return null;

  const inlineError = touched && !currentValidation.valid ? currentValidation.message : '';

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
          Enter your Clash Royale player tag or API token. We’ll validate as you type.
        </p>

        {success && (
          <Banner type="success" style={{ marginBottom: 8 }}>
            {success}
          </Banner>
        )}
        {error && (
          <Banner type="error" style={{ marginBottom: 8 }}>
            {error}
          </Banner>
        )}

        <div style={styles.segmentControl} role="tablist" aria-label="Input mode">
          <button
            role="tab"
            aria-selected={mode === 'tag'}
            onClick={() => { setMode('tag'); setTouched(false); setError(''); setSuccess(''); }}
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
            onClick={() => { setMode('token'); setTouched(false); setError(''); setSuccess(''); }}
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
                ref={firstFieldRef}
                onChange={(e) => setTag(e.target.value)}
                onBlur={() => setTouched(true)}
                style={{
                  ...styles.input,
                  ...(inlineError ? styles.inputError : {}),
                }}
                aria-invalid={!!inlineError}
                aria-describedby="player-tag-help"
              />
              <div id="player-tag-help" style={styles.helpText}>
                Find your tag in-game. # is optional; we’ll normalize it.
              </div>
              <InlineError message={inlineError} />
            </div>
          ) : (
            <div style={styles.fieldGroup}>
              <label htmlFor="api-token" style={styles.label}>API Token</label>
              <input
                id="api-token"
                name="apiToken"
                placeholder="Enter your API token"
                value={token}
                ref={firstFieldRef}
                onChange={(e) => setToken(e.target.value)}
                onBlur={() => setTouched(true)}
                style={{
                  ...styles.input,
                  ...(inlineError ? styles.inputError : {}),
                }}
                aria-invalid={!!inlineError}
                aria-describedby="api-token-help"
              />
              <div id="api-token-help" style={styles.helpText}>
                Keep this token private. It will be sent securely.
              </div>
              <InlineError message={inlineError} />
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

        {linked && (
          <div style={styles.managePanel} aria-live="polite">
            <div style={styles.manageHeader}>
              <strong>Linked as {crProfile?.tag || 'Unknown'}</strong>
              <span style={styles.manageHint}>Manage your linked account</span>
            </div>
            <div style={styles.manageActions}>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={submitting}
                style={styles.unlinkButton}
              >
                {submitting ? 'Unlinking…' : 'Unlink account'}
              </button>
            </div>
          </div>
        )}
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
    maxWidth: 540,
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
  managePanel: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    background: '#F9FAFB',
  },
  manageHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  manageHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  manageActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  unlinkButton: {
    background: '#FFFFFF',
    color: '#991B1B',
    border: '1px solid #EF4444',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
  },
};
