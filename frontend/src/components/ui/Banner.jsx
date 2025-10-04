import React from 'react';

const palette = {
  info:   { bg: '#EFF6FF', border: '#DBEAFE', color: '#1E3A8A', icon: 'ℹ️' },
  success:{ bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', icon: '✅' },
  warning:{ bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: '⚠️' },
  error:  { bg: '#FEF2F2', border: '#FCA5A5', color: 'var(--color-error, #EF4444)', icon: '⛔' },
};

/**
 * Banner
 * Consistent status and error messaging with optional dismiss action.
 *
 * Props:
 * - type: 'info' | 'success' | 'warning' | 'error'
 * - onClose: function to dismiss (renders an × button if provided)
 * - children: content
 * - roleOverride: explicitly set ARIA role if needed
 * - inline: reduces padding and radius slightly
 */
// PUBLIC_INTERFACE
export default function Banner({ type = 'info', onClose, children, roleOverride, inline = false, style }) {
  /** This is a public function. */
  const tone = palette[type] || palette.info;
  // Default ARIA role: make warning and error assertive to satisfy existing tests
  const role = roleOverride || (type === 'error' || type === 'warning' ? 'alert' : 'status');

  return (
    <div
      role={role}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        padding: inline ? '6px 8px' : '10px 12px',
        borderRadius: inline ? 8 : 10,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden="true">{tone.icon}</span>
        <div>{children}</div>
      </div>
      {typeof onClose === 'function' ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          style={{
            border: 'none',
            background: 'transparent',
            color: tone.color,
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
