import * as Localization from "expo-localization";
import dayjs from "dayjs";
import type { ConfigType } from "dayjs";
import { dateLocale } from "@/lib/translation";

/** Device settings that decide how dates and times display. */
export interface DateFormatSettings {
  /** BCP 47 tag with region, for example `en-DE`. */
  locale: string;
  /** Device 24-hour clock setting. `null` uses the locale default. */
  uses24hourClock: boolean | null;
}

const isValidLocale = (locale: string) => {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(locale).length > 0;
  } catch {
    return false;
  }
};

/**
 * Date and time formatters for one locale and clock setting.
 *
 * Uses `Intl.DateTimeFormat`, so day/month order, separators, and month
 * names follow the region. Dates spell out the month, so `2 May` and
 * `May 2` never read as the same numeric date. The year shows only for
 * dates outside the current year.
 */
export const createDateFormat = ({
  locale,
  uses24hourClock,
}: DateFormatSettings) => {
  const resolvedLocale = isValidLocale(locale) ? locale : "en";
  const time: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: uses24hourClock === null ? undefined : !uses24hourClock,
  };

  const formatter = (options: Intl.DateTimeFormatOptions) => {
    // oxlint-disable-next-line react-doctor/js-hoist-intl -- Runs once per createDateFormat call, not per format.
    const thisYear = new Intl.DateTimeFormat(resolvedLocale, options);
    // oxlint-disable-next-line react-doctor/js-hoist-intl -- Runs once per createDateFormat call, not per format.
    const otherYear = new Intl.DateTimeFormat(resolvedLocale, {
      ...options,
      year: "numeric",
    });

    return (value: ConfigType, now: ConfigType = new Date()) => {
      const date = dayjs(value);
      const format = date.isSame(now, "year") ? thisYear : otherYear;
      return format.format(date.toDate());
    };
  };

  // oxlint-disable-next-line react-doctor/js-hoist-intl -- Runs once per createDateFormat call, not per format.
  const timeFormat = new Intl.DateTimeFormat(resolvedLocale, time);

  return {
    /** Time of day, for example `14:05` or `2:05 PM`. */
    time: (value: ConfigType) => timeFormat.format(dayjs(value).toDate()),
    /** Full day title, for example `Saturday, 2 May`. */
    day: formatter({ weekday: "long", day: "numeric", month: "long" }),
    /** Day and time, for example `Sat, 2 May, 14:05`. */
    dateTime: formatter({
      weekday: "short",
      day: "numeric",
      month: "short",
      ...time,
    }),
    /** Day and time without weekday for narrow screens: `2 May, 14:05`. */
    dateTimeCompact: formatter({ day: "numeric", month: "short", ...time }),
  };
};

/** Device 24-hour clock setting, or `null` when the platform does not say. */
export const uses24hourClock =
  Localization.getCalendars()[0]?.uses24hourClock ?? null;

/** Formatters for the device locale and clock setting. */
export const dateFormat = createDateFormat({
  locale: dateLocale,
  uses24hourClock,
});
