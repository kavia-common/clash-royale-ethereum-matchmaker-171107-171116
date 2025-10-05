import React from "react";

/**
 * PUBLIC_INTERFACE
 * InlineError shows a small error message.
 */
export default function InlineError({ message }) {
  if (!message) return null;
  return <div className="inline-error" role="alert">{message}</div>;
}
