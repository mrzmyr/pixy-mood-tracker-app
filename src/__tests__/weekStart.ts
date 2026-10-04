import dayjs from "dayjs";
import * as Localization from "expo-localization";
import { getWeekLocale } from "@/lib/translation";
import { getMonths } from "@/features/calendar/screens/Calendar/layout";

const getRows = (weekStart: number) =>
  getMonths({
    end: "2026-02-01",
    count: 1,
    locale: getWeekLocale({ weekStart }),
  })[0]?.weeks;

describe("Week start", () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([1, 2, 3, 4, 5, 6, 7])(
    "preserves system weekday %s",
    (firstWeekday) => {
      const locale = getWeekLocale({
        weekStart: firstWeekday - 1,
      });
      const start = dayjs("2026-10-03").locale(locale).startOf("week");

      expect(start.day()).toBe(firstWeekday - 1);
      expect(start.endOf("week").diff(start, "day")).toBe(6);
    }
  );

  test("retains date locale when browser has no calendar preference", () => {
    expect(getWeekLocale({ weekStart: null })).toBe(dayjs.locale());
  });

  test("month height follows device week start", () => {
    expect(getRows(0)).toBe(4);
    expect(getRows(1)).toBe(5);
  });

  test.each(["en-US", "de-DE", "lt-LT", "en"])(
    "%s keeps system week start independent of translation",
    (languageTag) => {
      const locales = Localization.getLocales();
      jest.isolateModules(() => {
        const isolatedLocalization = require("expo-localization");
        jest
          .spyOn(isolatedLocalization, "getLocales")
          .mockReturnValue([{ ...locales[0], languageTag }]);
        const isolatedDayjs = require("dayjs");
        const { getWeekLocale: getLocale } = require("@/lib/translation");
        const week = isolatedDayjs("2026-10-03").locale(
          getLocale({ weekStart: 1 })
        );
        expect(week.startOf("week").day()).toBe(1);
        expect(week.format("dddd")).toBe(
          languageTag === "de-DE" ? "Samstag" : "Saturday"
        );
      });
    }
  );

  test("device changes leave existing dates and global locale intact", () => {
    const globalLocale = dayjs.locale();
    const sunday = dayjs("2026-10-03").locale(getWeekLocale({ weekStart: 0 }));
    const monday = dayjs("2026-10-03").locale(getWeekLocale({ weekStart: 1 }));
    expect(sunday.startOf("week").day()).toBe(0);
    expect(monday.startOf("week").day()).toBe(1);
    expect(dayjs.locale()).toBe(globalLocale);
  });
});
