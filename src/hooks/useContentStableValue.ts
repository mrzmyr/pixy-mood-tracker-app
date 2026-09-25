import { useState } from "react";

/**
 * Returns `value`, but keeps the previously returned reference while the
 * JSON-serialized content is unchanged. Use it to skip effects, memos, and
 * context updates when a state update produced an equal copy.
 */
export const useContentStableValue = <Value>(value: Value): Value => {
  const serialized = JSON.stringify(value);
  const [stable, setStable] = useState({ serialized, value });

  if (stable.serialized !== serialized) {
    // Adjusting state during render: React re-renders immediately with the
    // new value before committing.
    setStable({ serialized, value });
    return value;
  }

  return stable.value;
};
