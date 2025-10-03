import React, { useEffect, useMemo, useState } from 'react';

/**
 * Ocean Professional theme tokens for this component.
 */
const theme = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
};

/**
 * PUBLIC_INTERFACE
 * WagerFilter
 * A modular filter component for minimum/maximum wager in ETH.
 * Props:
 * - min: number (lowest selectable value)
 * - max: number (highest selectable value)
 * - value: { min: number, max: number }
 * - onChange: function({ min, max })
 */
export default function WagerFilter({ min = 0.01, max = 5, value, onChange }) {
  /** This is a public function. */
  const [local, setLocal] = useState({
    min: value?.min ?? min,
    max: value?.max ?? max,
  });

  useEffect(() => {
    // Keep local state in sync if parent updates
    setLocal({
      min: value?.min ?? min,
      max: value?.max ?? max,
    });
  }, [value, min, max]);

  const presets = useMemo(
    () => [
      { label: 'Any', min, max },
      { label: '≤ 0.1 ETH', min: min, max: 0.1 },
      { label: '0.1 – 0.5 ETH', min: 0.1, max: 0.5 },
      { label: '0.5 – 1.0 ETH', min: 0.5, max: 1.0 },
      { label: '≥ 1.0 ETH', min: 1.0, max },
    ],
    [min, max]
  );

  const safeNumber = (val) => {
    const n = parseFloat(val);
    return Number.isNaN(n) ? 0 : n;
  };

  const clamp = (val, lo, hi) => {
    if (val < lo) return lo;
    if (val > hi) return hi;
    return val;
  };

  // Ensure emitted values are proper numbers with min<=max and within global bounds
  const handleMinChange = (v) => {
    let nextMin = safeNumber(v);
    nextMin = clamp(nextMin, min, max);

    let nextMax = local.max;
    if (Number.isNaN(parseFloat(nextMax))) nextMax = min;
    nextMax = clamp(nextMax, min, max);

    if (nextMin > nextMax) {
      nextMax = nextMin;
    }

    const next = { min: nextMin, max: nextMax };
    setLocal(next);
    onChange?.(next);
  };

  const handleMaxChange = (v) => {
    let nextMax = safeNumber(v);
    nextMax = clamp(nextMax, min, max);

    let nextMin = local.min;
    if (Number.isNaN(parseFloat(nextMin))) nextMin = min;
    nextMin = clamp(nextMin, min, max);

    if (nextMax < nextMin) {
      nextMin = nextMax;
    }

    const next = { min: nextMin, max: nextMax };
    setLocal(next);
    onChange?.(next);
  };

  const applyPreset = (p) => {
    const next = { min: p.min, max: p.max };
    setLocal(next);
    onChange?.(next);
  };

  return (
    <aside style={styles.panel} aria-label="Wager filter">
      <div style={styles.panelHeader}>
        <h3 style={styles.title}>Filter by Wager</h3>
        <span style={styles.badge}>ETH</span>
      </div>

      <div style={styles.rangeRow}>
        <label htmlFor="min-wager" style={styles.label}>
          Min
        </label>
        <input
          id="min-wager"
          type="number"
          min={min}
          max={max}
          step="0.01"
          value={local.min}
          onChange={(e) => handleMinChange(e.target.value)}
          style={styles.input}
          aria-describedby="min-help"
        />
        <span style={styles.rangeDash}>–</span>
        <label htmlFor="max-wager" style={styles.label}>
          Max
        </label>
        <input
          id="max-wager"
          type="number"
          min={min}
          max={max}
          step="0.01"
          value={local.max}
          onChange={(e) => handleMaxChange(e.target.value)}
          style={styles.input}
          aria-describedby="max-help"
        />
      </div>
      <div id="min-help" style={styles.helpText}>
        Set minimum desired wager amount.
      </div>
      <div id="max-help" style={styles.helpText}>
        Set maximum desired wager amount.
      </div>

      <div style={styles.presets} role="group" aria-label="Wager presets">
        {presets.map((p) => {
          const active = p.min === local.min && p.max === local.max;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              style={{
                ...styles.presetButton,
                ...(active ? styles.presetActive : {}),
              }}
              aria-pressed={active}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

const styles = {
  panel: {
    width: 300,
    minWidth: 260,
    background: theme.surface,
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
    alignSelf: 'flex-start',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: theme.text,
  },
  badge: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.primary,
    background: '#EEF2FF',
    border: `1px solid ${theme.primary}33`,
    padding: '2px 8px',
    borderRadius: 999,
  },
  rangeRow: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto 1fr',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#374151',
    fontWeight: 600,
  },
  input: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    outline: 'none',
    fontSize: 14,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
  },
  rangeDash: {
    color: '#6B7280',
    fontWeight: 600,
    textAlign: 'center',
  },
  helpText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  presets: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  presetButton: {
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #E5E7EB',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  presetActive: {
    background: theme.primary,
    color: '#ffffff',
    borderColor: theme.primary,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
  },
};
