import React from 'react';

/**
 * Skeleton
 * Animated placeholder for loading states.
 *
 * Props:
 * - variant: 'text' | 'rect' | 'circle'
 * - width, height: number|string
 * - count: number of skeleton items to render (stacked vertically with small gap)
 */
// PUBLIC_INTERFACE
export default function Skeleton({ variant = 'rect', width, height, count = 1, style }) {
  /** This is a public function. */
  ensureSkeletonKeyframes();

  const baseStyle = {
    background: 'linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 37%, #E5E7EB 63%)',
    backgroundSize: '400% 100%',
    animation: 'kavia-skeleton 1.4s ease infinite',
    borderRadius: variant === 'text' ? 6 : 10,
    display: 'block',
  };

  const itemStyle = (idx) => ({
    width: width || (variant === 'text' ? '80%' : '100%'),
    height:
      height ||
      (variant === 'text' ? 12 : variant === 'circle' ? 40 : 16),
    borderRadius: variant === 'circle' ? '999px' : baseStyle.borderRadius,
    ...baseStyle,
    ...(style || {}),
    marginTop: idx === 0 ? 0 : 6,
  });

  const items = Array.from({ length: Math.max(1, Number(count) || 1) });

  return (
    <div aria-hidden="true">
      {items.map((_, i) => (
        <div key={i} style={itemStyle(i)} />
      ))}
    </div>
  );
}

let skelKeyframesInjected = false;
function ensureSkeletonKeyframes() {
  if (skelKeyframesInjected || typeof document === 'undefined') return;
  try {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-kavia-ui', 'skeleton');
    styleEl.innerHTML = `
@keyframes kavia-skeleton { 0% { background-position: 100% 50% } 100% { background-position: 0 50% } }
`;
    document.head.appendChild(styleEl);
    skelKeyframesInjected = true;
  } catch {
    // ignore
  }
}
