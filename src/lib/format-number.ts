import { getLocale } from "@/lib/translation";

/** From this absolute value on, numbers use compact notation (`38K`). */
export const COMPACT_FROM = 10_000;

/** Typographic minus (U+2212). Same width as `+`, unlike the ASCII hyphen. */
const MINUS = "−";

type Notation = "standard" | "compact";

// Formatters are slow to create. Cache one per locale and notation.
const formatters = new Map<string, Intl.NumberFormat>();

const createFormatter = (
  locale: string,
  notation: Notation
): Intl.NumberFormat => {
  if (notation === "compact") {
    // Hermes Intl may lack compact notation (throws or ignores it).
    // Use standard notation then: full digits, still locale separators.
    try {
      const compact = new Intl.NumberFormat(locale, { notation: "compact" });
      if (compact.resolvedOptions().notation === "compact") {
        return compact;
      }
    } catch {
      // Fall through to standard notation.
    }
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
};

const getFormatter = (
  locale: string,
  notation: Notation
): Intl.NumberFormat => {
  const key = `${locale}:${notation}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = createFormatter(locale, notation);
    formatters.set(key, formatter);
  }
  return formatter;
};

/**
 * Number in the user's format: locale separators, at most 2 decimals,
 * compact (`38K`, `1,2 Mio.`) from {@link COMPACT_FROM}. Negative values
 * use U+2212 minus.
 */
export const formatNumber = (value: number, locale = getLocale()): string => {
  const abs = Math.abs(value);
  const notation: Notation = abs >= COMPACT_FROM ? "compact" : "standard";
  const formatted = getFormatter(locale, notation).format(abs);
  return value < 0 ? `${MINUS}${formatted}` : formatted;
};

/**
 * Signed change for trend labels: `+1.5` up, `−1.5` (U+2212) down.
 * `value` is the size of the change; its sign is ignored.
 */
export const formatTrend = (
  value: number,
  direction: "up" | "down",
  locale = getLocale()
): string =>
  `${direction === "up" ? "+" : MINUS}${formatNumber(Math.abs(value), locale)}`;
