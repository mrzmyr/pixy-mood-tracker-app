import dayjs from "dayjs";

import {
  applyLocale,
  getLanguage,
  getLocale,
  getWeekLocale,
  t,
} from "@/lib/translation";

describe("applyLocale", () => {
  afterEach(() => {
    applyLocale("en-US");
  });

  it("switches translations and dayjs without a restart", () => {
    applyLocale("en-US");
    expect(t("cancel")).toBe("Cancel");

    applyLocale("de-DE");

    expect(getLocale()).toBe("de-DE");
    expect(getLanguage()).toBe("de");
    expect(t("cancel")).toBe("Abbrechen");
    expect(dayjs.locale()).toBe("de");
    expect(
      dayjs("2026-10-05")
        .locale(getWeekLocale({ weekStart: 1 }))
        .format("MMMM")
    ).toBe("Oktober");
  });

  it("falls back to English for a language without translations", () => {
    applyLocale("xx-XX");

    expect(t("cancel")).toBe("Cancel");
    expect(dayjs.locale()).toBe("en");
    expect(getWeekLocale({ weekStart: 1 })).toBe("en-week-1");
  });
});
