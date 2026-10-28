import dayjs from "dayjs";
import type { ImportData } from "@/features/datagate";
import type { LogItem } from "@/features/logs";
import type { MenstruationFlow } from "@/types";

const FLOWS = [
  "none",
  "spotting",
  "light",
  "medium",
  "heavy",
] satisfies MenstruationFlow[];

/** Six days, every flow, and an unlogged day. Step stays off for opt-in tests. */
export const withMenstruation = (data: ImportData): ImportData => ({
  ...data,
  settings: {
    ...data.settings,
    steps: ["rating", "message"],
    reminderEnabled: true,
  },
  items: [...FLOWS, undefined].map((flow, index): LogItem => {
    const dateTime = dayjs("2026-10-06T00:00:00")
      .add(index, "day")
      .toISOString();
    return {
      id: `a0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      date: dayjs(dateTime).format("YYYY-MM-DD"),
      dateTime,
      createdAt: dateTime,
      rating: "neutral",
      sleep: { quality: "neutral" },
      menstruation: flow === undefined ? undefined : { flow },
      message: flow === undefined ? "Not logged" : "",
      tags: [],
      people: [],
      emotions: [],
      photos: [],
    };
  }),
});
