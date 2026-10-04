import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { DATE_FORMAT } from "@/constants/Config";
import { getItemDate } from "@/lib/logDates";
import type { InterventionCluster } from "@/state/analytics/events";
import { CLUSTERS } from "./catalog";

/** Cluster picked for an entry, with the emotions that matched it. */
export interface ClusterMatch {
  cluster: InterventionCluster;
  /** Entry emotions that belong to the cluster. */
  emotions: string[];
}

/** First cluster in priority order with a matching emotion, else `null`. */
export const matchCluster = (emotions: string[]): ClusterMatch | null => {
  for (const { cluster, emotions: keys } of CLUSTERS) {
    const matched = emotions.filter((emotion) => keys.includes(emotion));
    if (matched.length > 0) {
      return { cluster, emotions: matched };
    }
  }
  return null;
};

/**
 * Match for the calendar card: the latest entry of today with a matching
 * emotion. Resets at midnight because only today's entries count.
 */
export const matchToday = (
  items: LogItem[],
  now = dayjs()
): (ClusterMatch & { item: LogItem }) | null => {
  const today = now.format(DATE_FORMAT);
  const matches: (ClusterMatch & { item: LogItem })[] = [];
  for (const item of items) {
    const match =
      getItemDate(item) === today ? matchCluster(item.emotions) : null;
    if (match) {
      matches.push({ ...match, item });
    }
  }
  // Latest first.
  matches.sort(
    (a, b) =>
      dayjs(b.item.dateTime).valueOf() - dayjs(a.item.dateTime).valueOf()
  );

  return matches[0] ?? null;
};
