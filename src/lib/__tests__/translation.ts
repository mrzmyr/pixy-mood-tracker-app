import dayjs from "dayjs";

import { applyLocale, getLanguage, getLocale, t } from "@/lib/translation";

describe("applyLocale", () => {
  afterEach(() => {
    applyLocale("en-US", "US");
  });

  it("switches translations, dayjs, and week start without a restart", () => {
    applyLocale("en-US", "US");
    expect(t("cancel")).toBe("Cancel");
    expect(dayjs.Ls.en?.weekStart ?? 0).toBe(0);

    applyLocale("de-DE", "DE");

    expect(getLocale()).toBe("de-DE");
    expect(getLanguage()).toBe("de");
    expect(t("cancel")).toBe("Abbrechen");
    expect(dayjs.locale()).toBe("de");
    expect(dayjs.Ls.de?.weekStart).toBe(1);
  });

  it("falls back to English for a language without translations", () => {
    applyLocale("xx-XX", null);

    expect(t("cancel")).toBe("Cancel");
    expect(dayjs.locale()).toBe("en");
  });
});
