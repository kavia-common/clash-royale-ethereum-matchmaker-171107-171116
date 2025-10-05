import React, { useEffect, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * WagerFilter allows inputting min/max wager amounts and notifies parent on change.
 */
export default function WagerFilter({ onChange }) {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  useEffect(() => {
    const payload = {
      min: min === "" ? null : Number(min),
      max: max === "" ? null : Number(max),
    };
    onChange && onChange(payload);
  }, [min, max, onChange]);

  return (
    <div className="card">
      <div className="row space-between">
        <strong>Wager Filter</strong>
        <button className="btn" onClick={() => { setMin(""); setMax(""); }}>
          Reset
        </button>
      </div>
      <div className="row mt-2" style={{ gap: 12 }}>
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
