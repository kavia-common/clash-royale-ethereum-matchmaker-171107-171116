import React from 'react';

/**
 * Spinner
 * Accessible loading indicator using CSS ring spinner.
 * Uses CSS variables defined in theme.css/App.css for color.
 */
// PUBLIC_INTERFACE
export default function Spinner({
  /** Diameter in px */
  size = 18,
  /** Accessible screen-reader text; if provided, an offscreen span will be rendered */
  srText,
  /** Additional inline styles */
  style,
  /** ARIA live politeness; default polite for spinners */
  ariaLive = 'polite',
}) {
  /** This is a public function. */
  // Inject keyframes once
  ensureKeyframes();

  const spinnerStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: '3px solid var(--spinner-track, #BFDBFE)',
    borderTopColor: 'var(--color-primary, #2563EB)',
    animation: 'kavia-spin 1s linear infinite',
    display: 'inline-block',
    ...style,
  };

  return (
    <span
      role="status"
      aria-busy="true"
      aria-live={ariaLive}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      <i aria-hidden="true" style={spinnerStyle} />
      {srText ? (
        <span style={srOnlyStyles}>{srText}</span>
      ) : null}
    </span>
  );
}

const srOnlyStyles = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

let keyframesInjected = false;
function ensureKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return;
  try {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-kavia-ui', 'spinner');
    styleEl.innerHTML = `
@keyframes kavia-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
`;
    document.head.appendChild(styleEl);
    keyframesInjected = true;
  } catch {
    // ignore
  }
}
