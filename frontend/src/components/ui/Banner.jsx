import React, { useState } from 'react';

/**
 * Banner
 * Informational, success, warning, or error banner with Ocean Professional styling.
 *
 * Props:
 * - type: 'info' | 'success' | 'warning' | 'error' (alias: variant)
 * - children: node
 * - role: string (optional override)
 * - onClose?: function - when provided, renders a dismiss button and calls onClose when clicked
 * - className?: string - optional className
 */
// PUBLIC_INTERFACE
export default function Banner({
  type = 'info',
  variant,
  children,
  role,
  style,
  onClose,
  className,
  ...rest
}) {
  /** This is a public function. */
  const tone = variant || type;

  // Ocean Professional aligned palette
  const palette = {
    info: {
      bg: '#EFF6FF',
      border: '#93C5FD',
      text: '#1E3A8A',
      icon: 'ℹ️',
      aria: 'status',
    },
    success: {
      // success uses the secondary amber per style guide
      bg: '#FFFBEB',
      border: '#F59E0B',
      text: '#7C2D12',
      icon: '✅',
      aria: 'status',
    },
    warning: {
      bg: '#FEF3C7',
      border: '#F59E0B',
      text: '#92400E',
      icon: '⚠️',
      aria: 'alert',
    },
    error: {
      bg: '#FEF2F2',
      border: '#EF4444',
      text: '#991B1B',
      icon: '⛔',
      aria: 'alert',
    },
  };

  const t = palette[tone] || palette.info;

  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const handleClose = () => {
    setHidden(true);
    if (onClose) onClose();
  };

  return (
    <div
      role={role || t.aria}
      aria-live={t.aria === 'alert' ? 'assertive' : 'polite'}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.text,
        padding: '10px 12px',
        borderRadius: 10,
        fontSize: 14,
        lineHeight: 1.3,
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true">{t.icon}</span>
      <div style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{children}</div>
      {typeof onClose === 'function' && (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={handleClose}
          style={{
            marginLeft: 8,
            background: 'transparent',
            border: '1px solid transparent',
            color: t.text,
            cursor: 'pointer',
            borderRadius: 8,
            padding: '2px 6px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
