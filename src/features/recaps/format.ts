/** Signed mood steps, one decimal: "+0.8", "−0.4", "+0.0" near zero. */
export const formatDelta = (delta: number) => {
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded < 0 ? "−" : "+"}${Math.abs(rounded).toFixed(1)}`;
};
