import { useEffect, useEffectEvent, useRef } from "react";
import type { LogItem } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import type { ConfirmationAnswer } from "@/state/analytics/events";
import { getEntryProperties } from "./entryProperties";

/** Answers in display order, worst to best. */
export const CONFIRMATION_ANSWERS: ConfirmationAnswer[] = [
  "worse",
  "same",
  "better",
];

/**
 * State and analytics for the confirmation after a new entry.
 *
 * Sends `logger:confirmation_viewed` once on mount. `answer` and `skip`
 * send their event only for the first call, so a double tap counts once.
 * Closing without an answer (swipe down, app kill excluded) counts as skip.
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
    analytics.track("logger:confirmation_skipped", {
      ...properties,
      skip_ms: Date.now() - shownAt.current,
    });
  };

  const answer = (value: ConfirmationAnswer) => {
    if (isDone.current) {
      return;
    }
    isDone.current = true;
    analytics.track("logger:confirmation_answered", {
      ...properties,
      answer: value,
      answer_ms: Date.now() - shownAt.current,
    });
  };

  // Effect events: read the latest properties; only mount and unmount send.
  const trackViewed = useEffectEvent(() => {
    analytics.track("logger:confirmation_viewed", properties);
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
