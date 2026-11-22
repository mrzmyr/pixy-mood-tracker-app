import dayjs from "dayjs";
import type { Person } from "@/features/people";
import { t } from "@/lib/translation";
import { daysBetween } from "./days";
import type { DateKey, RecapDay } from "./types";

/** Latest connected day per person. `days` run oldest first. */
export const lastConnected = (days: RecapDay[]) => {
  const last = new Map<Person["id"], DateKey>();
  for (const day of days) {
    for (const item of day.items) {
      for (const person of item.people) {
        last.set(person.id, day.date);
      }
    }
  }
  return last;
};

/** "Today", "3d ago", "2w ago", "4mo ago": short, as in a list value. */
export const formatAgo = (date: DateKey, today: DateKey) => {
  const days = daysBetween(date, today);
  if (days === 0) {
    return t("today");
  }
  if (days < 7) {
    return t("orbit_days_ago", { count: days });
  }
  if (days < 30) {
    return t("orbit_weeks_ago", { count: Math.floor(days / 7) });
  }
  return t("orbit_months_ago", {
    count: Math.max(1, dayjs(today).diff(dayjs(date), "month")),
  });
};
