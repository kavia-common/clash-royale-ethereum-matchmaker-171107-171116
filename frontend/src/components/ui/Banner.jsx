import React from 'react';

/**
 * Banner
 * Informational, success, warning, or error banner with Ocean Professional styling.
 *
 * Props:
 * - type: 'info' | 'success' | 'warning' | 'error'
 * - children: node
 * - role: string (optional override)
 */
// PUBLIC_INTERFACE
export default function Banner({ type = 'info', children, role, style, ...rest }) {
  /** This is a public function. */
  const palette = {
    info: {
      bg: '#EFF6FF',
      border: '#93C5FD',
      text: '#1E3A8A',
      icon: 'ℹ️',
      aria: 'status',
    },
    success: {
      bg: '#ECFDF5',
      border: '#6EE7B7',
      text: '#065F46',
      icon: '✅',
      aria: 'status',
    },
    warning: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      icon: '⚠️',
      aria: 'alert',
    },
    error: {
      bg: '#FEF2F2',
      border: '#FCA5A5',
      text: '#991B1B',
      icon: '⛔',
      aria: 'alert',
    },
  };

  const t = palette[type] || palette.info;

  return (
    <div
      role={role || t.aria}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.text,
        padding: '8px 10px',
        borderRadius: 10,
        fontSize: 14,
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true">{t.icon}</span>
      <span style={{ fontWeight: 600 }}>{children}</span>
    </div>
  );
}
