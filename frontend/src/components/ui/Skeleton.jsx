import React from "react";

/**
 * PUBLIC_INTERFACE
 * Skeleton renders a gray placeholder box for loading states.
 */
export default function Skeleton({ width = "100%", height = 16 }) {
  const style = { width, height, borderRadius: 8 };
  return <div className="skeleton" style={style} aria-hidden="true" />;
}
