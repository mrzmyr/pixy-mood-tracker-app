import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import type { LoggerStep } from "@/constants/logger-steps";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { useFeatureFlag } from "@/state/feature-flags";
import { EMOTIONS } from "../../config";
import { LoggerCreate } from "../../logger";
import { parseLoggerPrefill } from "../../prefill";
import { getRestoredDraft } from "../../recovery/restored-draft";

/**
 * Route wrapper that opens the logger for a new entry at the rating slide.
 * Optional `prefill` param: see `parseLoggerPrefill`. Optional `restore`
 * param: id of the recovery snapshot to continue, at slide `step`.
 */
export const LogCreate = () => {
  const {
    dateTime,
    prefill: prefillParam,
    restore,
    step,
  } = useLocalSearchParams<{
    dateTime: string;
    prefill?: string;
    restore?: string;
    step?: LoggerStep;
  }>();
  // Read once: the handoff clears when this logger closes.
  const restored = useMemo(() => getRestoredDraft(restore), [restore]);
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const hasPeople = useFeatureFlag("people");
  const prefill = parseLoggerPrefill(prefillParam, {
    tags: tags.flatMap((tag) => (tag.isArchived ? [] : [tag.id])),
    people: hasPeople
      ? people.flatMap((person) => (person.isArchived ? [] : [person.id]))
      : [],
    emotions: EMOTIONS.flatMap((emotion) =>
      emotion.disabled ? [] : [emotion.key]
    ),
  });
  return (
    <LoggerCreate
      dateTime={dateTime}
      initialStep={restored ? step : "rating"}
      prefill={restored ? null : prefill}
      restoredDraft={restored?.draft}
    />
  );
};
