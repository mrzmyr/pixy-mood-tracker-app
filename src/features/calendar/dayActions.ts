import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { isConfirmed } from "@/lib/promptCancel";
import { askToRemove } from "@/lib/prompts";
import { useAnalytics } from "@/state/analytics";

/** Where a day action starts: the day view or the calendar day long-press menu. */
export type DayActionSource = "day" | "calendar_menu";

/**
 * Add, edit, and delete entries of one day. The day view and the calendar
 * day menu share these, so both track the same events and Delete asks for
 * confirmation in both.
 *
 * New entries use the current time of day on `date`.
 */
export const useDayActions = (date: string, source: DayActionSource) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const logUpdater = useLogUpdater();

  const handleAdd = () => {
    analytics.track("day:add_tapped", { source });
    router.push({
      pathname: "/logs/create/[dateTime]",
      params: {
        dateTime: dayjs(date)
          .hour(dayjs().hour())
          .minute(dayjs().minute())
          .toISOString(),
      },
    });
  };

  const handleEdit = (item: LogItem) => {
    analytics.track("day:edit_tapped", { source });
    router.push({ pathname: "/logs/[id]/edit", params: { id: item.id } });
  };

  /** Asks first. Cancel keeps the entry. */
  const handleDelete = async (item: LogItem) => {
    if (!(await isConfirmed(askToRemove()))) {
      return;
    }
    analytics.track("day:delete_tapped", { source });
    logUpdater.deleteLog(item.id);
    logUpdater.sweepPhotos();
  };

  return { handleAdd, handleEdit, handleDelete };
};
