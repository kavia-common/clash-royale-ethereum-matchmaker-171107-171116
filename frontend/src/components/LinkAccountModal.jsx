import React, { useEffect, useMemo, useRef, useState } from 'react';
import InlineError from './ui/InlineError';
import Banner from './ui/Banner';
import { apiCRLink, apiGetCRMe, apiCRUnlink } from '../services/api';

/**
 * PUBLIC_INTERFACE
 * LinkAccountModal:
 * Props:
 * - open: boolean
 * - onClose: function
 */
export default function LinkAccountModal({ open, onClose }) {
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkedData, setLinkedData] = useState(null);
  const inputRef = useRef(null);

  const normalizeTag = (t) => {
    if (!t) return '';
    let s = String(t).trim().toUpperCase();
    s = s.replace(/^#+/, '');
    s = s.replace(/[^A-Z0-9]/g, '');
    return s;
  };

  useEffect(() => {
    let mounted = true;
    if (open) {
      setSuccess('');
      setInlineError('');
      setTimeout(() => inputRef.current?.focus(), 50);
      (async () => {
        try {
          const me = await apiGetCRMe();
          if (mounted) setLinkedData(me);
          if (mounted && me?.linked && me?.crTag) setTag(me.crTag);
        } catch {
          if (mounted) setLinkedData(null);
        }
      })();
    } else {
      setTag('');
      setLinkedData(null);
      setInlineError('');
      setSuccess('');
    }
    return () => { mounted = false; };
  }, [open]);

  const canSubmit = useMemo(() => {
    const norm = normalizeTag(tag);
    return !!norm && !loading;
  }, [tag, loading]);

  const submit = async (e) => {
    e?.preventDefault?.();
    setInlineError('');
    setSuccess('');
    const norm = normalizeTag(tag);
    if (!norm) {
      setInlineError('Please enter a valid Clash Royale tag.');
      return;
    }
    setLoading(true);
    try {
      await apiCRLink({ tag: `#${norm}` });
      const me = await apiGetCRMe();
      setLinkedData(me);
      setSuccess('Clash Royale account linked.');
      setTimeout(() => onClose?.(), 500);
      try {
        window.dispatchEvent(new CustomEvent('cr-link-success'));
      } catch {}
    } catch (e2) {
      setInlineError(e2?.message || 'Failed to link account.');
    } finally {
      setLoading(false);
    }
  };

  const doUnlink = async () => {
    setLoading(true);
    setInlineError('');
    setSuccess('');
    try {
      await apiCRUnlink();
      const me = await apiGetCRMe();
      setLinkedData(me);
      setSuccess('Unlinked successfully.');
      setTimeout(() => onClose?.(), 400);
    } catch (e2) {
      setInlineError(e2?.message || 'Failed to unlink.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="link-title">
      <div className="modal small">
        <header className="modal-header">
          <h3 id="link-title">Clash Royale Account</h3>
          <button aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          {success && <Banner type="success" style={{ marginBottom: 8 }}>{success}</Banner>}
          {inlineError && <Banner type="error" style={{ marginBottom: 8 }}>{inlineError}</Banner>}
          <form onSubmit={submit}>
            <label htmlFor="cr-tag">Player Tag</label>
            <input
              id="cr-tag"
              ref={inputRef}
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., #ABC123"
              aria-invalid={!!inlineError}
            />
            <InlineError message={inlineError} />
            <div className="row mt-2" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
              <button className="btn-primary" type="submit" disabled={!canSubmit}>
                {loading ? 'Linking…' : 'Link'}
              </button>
              {linkedData?.linked && (
                <button className="btn" type="button" onClick={doUnlink} disabled={loading}>
                  Unlink
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
