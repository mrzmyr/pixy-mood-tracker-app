import { createDateFormat } from "@/lib/dateFormat";

// Punctuation differs between ICU versions, so assertions check order and
// parts, not full strings.
const now = "2026-10-11T12:00:00";
const may2 = "2026-05-02T14:05:00";

const format = (locale: string, uses24hourClock: boolean | null = null) =>
  createDateFormat({ locale, uses24hourClock });

describe("dateFormat", () => {
  it("orders day and month by region, not language", () => {
    expect(format("en-US").dateTime(may2, now)).toMatch(/May 2\b.*2:05 PM/u);
    expect(format("en-DE").dateTime(may2, now)).toMatch(/\b2 May\b.*14:05/u);
    expect(format("en-GB").day(may2, now)).toMatch(/Saturday,? 2 May$/u);
    expect(format("de-DE").day(may2, now)).toMatch(/Samstag,? 2\. Mai$/u);
  });

  it("follows the device 24-hour clock setting over the locale default", () => {
    expect(format("en-US", true).time(may2)).toBe("14:05");
    expect(format("en-GB", false).time(may2)).toMatch(/^2:05\s?pm$/iu);
  });

  it("shows the year only outside the current year", () => {
    expect(format("en-GB").day("2025-05-02", now)).toMatch(/2 May 2025$/u);
    expect(format("en-GB").dateTimeCompact(may2, now)).not.toMatch(/2026/u);
  });

  it("reads YYYY-MM-DD as a local day", () => {
    expect(format("en-GB").day("2026-01-01", now)).toMatch(/^Thursday/u);
  });

  it("falls back to English for an invalid locale", () => {
    expect(format("not a locale").day(may2, now)).toMatch(/^Saturday/u);
  });
});
