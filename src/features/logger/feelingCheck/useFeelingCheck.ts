import { useEffect, useEffectEvent, useRef } from "react";
import type { LogItem } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import type { FeelingCheckAnswer } from "@/state/analytics/events";
import { getEntryProperties } from "./entryProperties";

/** Answers in display order, worst to best. */
export const FEELING_CHECK_ANSWERS: FeelingCheckAnswer[] = [
  "worse",
  "same",
  "better",
];

/**
 * State and analytics for the feeling check after a new entry.
 *
 * Sends `logger:feeling_check_viewed` once on mount. `answer` and `skip`
 * send their event only for the first call, so a double tap counts once.
 * Closing without an answer (swipe down, app kill excluded) counts as skip.
 */
export const useFeelingCheck = ({
  item,
  entriesCount,
}: {
  item: LogItem;
  /** All entries, including `item`. */
  entriesCount: number;
}) => {
  const analytics = useAnalytics();
  const shownAt = useRef(0);
  const isDone = useRef(false);

  const properties = getEntryProperties({
    item,
    entriesCount,
  });

  const skip = () => {
    if (isDone.current) {
      return;
    }
    isDone.current = true;
    analytics.track("logger:feeling_check_skipped", {
      ...properties,
      skip_ms: Date.now() - shownAt.current,
    });
  };

  const answer = (value: FeelingCheckAnswer) => {
    if (isDone.current) {
      return;
    }
    isDone.current = true;
    analytics.track("logger:feeling_check_answered", {
      ...properties,
      answer: value,
      answer_ms: Date.now() - shownAt.current,
    });
  };

  // Effect events: read the latest properties; only mount and unmount send.
  const trackViewed = useEffectEvent(() => {
    analytics.track("logger:feeling_check_viewed", properties);
  });
  const skipOnClose = useEffectEvent(skip);

  useEffect(() => {
    shownAt.current = Date.now();
    trackViewed();

    return () => {
      skipOnClose();
    };
  }, []);

  return {
    answer,
    skip,
  };
};
