const isDate = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

/**
 * Store review prompt dates from stored settings, oldest first.
 *
 * Settings before the dates list held one `storeReviewPromptedAt` date or
 * `null`. That date becomes the first entry, so users prompted once keep
 * their prompt. Values that are not dates are dropped.
 */
export const toStoreReviewPromptDates = (stored: {
  storeReviewPromptDates?: unknown;
  storeReviewPromptedAt?: unknown;
}): string[] => {
  const dates = Array.isArray(stored.storeReviewPromptDates)
    ? stored.storeReviewPromptDates.filter(isDate)
    : [];
  const legacy = isDate(stored.storeReviewPromptedAt)
    ? [stored.storeReviewPromptedAt]
    : [];
  return [...new Set([...legacy, ...dates])].sort(
    (a, b) => Date.parse(a) - Date.parse(b)
  );
};
