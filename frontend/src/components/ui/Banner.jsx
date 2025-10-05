import React from 'react';

/**
 * Banner component for displaying top-level alerts or information.
 * Styled to align with Ocean Professional theme.
 *
 * Props:
 * - variant: 'info' | 'warning' | 'error' (affects color)
 * - message: string or React node
 * - action: optional { label: string, href?: string, onClick?: function }
 * - className: optional extra classes
 */
export default function Banner({ variant = 'info', message, action, className = '' }) {
  const variants = {
    info: {
      bg: '#e0ebff',
      border: '#2563EB',
      text: '#1e3a8a',
    },
    warning: {
      bg: '#fff7ed',
      border: '#F59E0B',
      text: '#7c2d12',
    },
    error: {
      bg: '#fee2e2',
      border: '#EF4444',
      text: '#7f1d1d',
    },
  };

  const v = variants[variant] || variants.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`ui-banner ${className}`}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.text,
        padding: '10px 14px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
      data-testid="ui-banner"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            background: v.border,
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
        <div style={{ fontSize: 14, lineHeight: 1.3 }}>{message}</div>
      </div>
      {action ? (
        action.href ? (
          <a
            href={action.href}
            target="_blank"
            rel="noreferrer"
            className="ui-banner-action"
            style={{
              color: '#2563EB',
              textDecoration: 'underline',
              fontWeight: 600,
              fontSize: 13,
              marginLeft: 12,
            }}
          >
            {action.label}
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="ui-banner-action-btn"
            style={{
              color: '#2563EB',
              background: 'transparent',
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              marginLeft: 12,
            }}
            aria-label={typeof action.label === 'string' ? action.label : 'Banner action'}
          >
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
