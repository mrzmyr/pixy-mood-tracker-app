import { formatNumber, formatTrend } from "@/lib/formatNumber";
import { applyLocale } from "@/lib/translation";

describe("formatNumber", () => {
  afterEach(() => {
    applyLocale("en-US");
  });

  it("uses the locale's decimal and group separators", () => {
    expect(formatNumber(1.23, "en-US")).toBe("1.23");
    expect(formatNumber(1.23, "de-DE")).toBe("1,23");
    expect(formatNumber(9999, "en-US")).toBe("9,999");
    expect(formatNumber(9999, "de-DE")).toBe("9.999");
  });

  it("rounds to at most 2 decimals", () => {
    expect(formatNumber(1.236, "en-US")).toBe("1.24");
    expect(formatNumber(3, "en-US")).toBe("3");
  });

  it("goes compact from 10,000, not below", () => {
    expect(formatNumber(9999, "en-US")).toBe("9,999");
    expect(formatNumber(10_000, "en-US")).toBe("10K");
    expect(formatNumber(38_123, "en-US")).toBe("38K");
    expect(formatNumber(1_234_567, "de-DE")).toBe("1,2 Mio.");
  });

  it("uses U+2212 minus for negative values", () => {
    expect(formatNumber(-1.5, "en-US")).toBe("−1.5");
    expect(formatNumber(-12_000, "en-US")).toBe("−12K");
  });

  it("follows the app locale by default", () => {
    applyLocale("de-DE");
    expect(formatNumber(1.5)).toBe("1,5");
  });
});

describe("formatTrend", () => {
  it("prefixes + for up and U+2212 for down", () => {
    expect(formatTrend(2, "up", "en-US")).toBe("+2");
    expect(formatTrend(0.5, "down", "de-DE")).toBe("−0,5");
  });

  it("ignores the sign of the value", () => {
    expect(formatTrend(-3, "down", "en-US")).toBe("−3");
    expect(formatTrend(-3, "up", "en-US")).toBe("+3");
  });
});
