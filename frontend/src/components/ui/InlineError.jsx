import React from 'react';

/**
 * InlineError
 * Compact helper/error text intended to be wired with aria-describedby to inputs.
 *
 * Props:
 * - id: string, to be referenced by input aria-describedby
 * - live: boolean, if true uses role='alert' and aria-live='assertive'
 * - children: string | node, error message
 */
// PUBLIC_INTERFACE
export default function InlineError({ id, live = false, children, style }) {
  /** This is a public function. */
  return (
    <div
      id={id}
      role={live ? 'alert' : undefined}
      aria-live={live ? 'assertive' : undefined}
      style={{
        fontSize: 12,
        color: 'var(--color-error, #EF4444)',
        marginTop: 4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
