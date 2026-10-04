import { useEffect, useEffectEvent } from "react";
import type { LogItem } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import { getEntryProperties } from "./entryProperties";

/**
 * Analytics for the confirmation after a new entry: sends
 * `logger:confirmation_viewed` once on mount.
 */
export const useConfirmation = ({
  item,
  entriesCount,
}: {
  item: LogItem;
  /** All entries, including `item`. */
  entriesCount: number;
}) => {
  const analytics = useAnalytics();

  // Effect event: reads the latest properties; only mount sends.
  const trackViewed = useEffectEvent(() => {
    analytics.track(
      "logger:confirmation_viewed",
      getEntryProperties({ item, entriesCount })
    );
  });

  useEffect(() => {
    trackViewed();
  }, []);
};
