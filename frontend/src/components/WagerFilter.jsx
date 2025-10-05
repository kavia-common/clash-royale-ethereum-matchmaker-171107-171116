import React, { useEffect, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * WagerFilter allows inputting min/max wager amounts and q (text) and notifies parent on change.
 * Props:
 * - onChange({min,max,q})
 * - applyFilter({min,max,q}) backward-compatible alias
 * - value?: {min,max,q} optional controlled value
 */
export default function WagerFilter({ onChange, applyFilter, value }) {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [q, setQ] = useState("");

  // sync from controlled value if provided
  useEffect(() => {
    if (value) {
      setMin(value.min == null ? "" : String(value.min));
      setMax(value.max == null ? "" : String(value.max));
      setQ(value.q || "");
    }
  }, [value?.min, value?.max, value?.q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const payload = {
      min: min === "" ? null : Number(min),
      max: max === "" ? null : Number(max),
      q,
    };
    if (onChange) onChange(payload);
    if (applyFilter) applyFilter(payload);
  }, [min, max, q, onChange, applyFilter]);

  return (
    <div>
      <div className="row space-between">
        <strong>Filter profiles</strong>
        <button
          className="btn"
          onClick={() => {
            setMin("");
            setMax("");
            setQ("");
          }}
          aria-label="Reset filters"
        >
          Reset
        </button>
      </div>
      <div className="row mt-2" style={{ gap: 12 }}>
        <label>
          Search
          <input
            data-testid="text-search-input"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, tag, availability"
          />
        </label>
        <label>
          Min (ETH)
          <input
            data-testid="min-wager-input"
            type="number"
            step="0.001"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="0.01"
          />
        </label>
        <label>
          Max (ETH)
          <input
            data-testid="max-wager-input"
            type="number"
            step="0.001"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="0.1"
          />
        </label>
      </div>
    </div>
  );
}
