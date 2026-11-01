import { t } from "@/lib/translation";

/** "7h 5m", or "15m" below an hour. */
export const formatSleepMinutes = (total: number) =>
  total < 60
    ? t("health_sleep_minutes", { minutes: total })
    : t("health_sleep_duration", {
        hours: Math.floor(total / 60),
        minutes: total % 60,
      });
