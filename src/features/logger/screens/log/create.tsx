import { useLocalSearchParams } from "expo-router";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { useFeatureFlag } from "@/state/feature-flags";
import { EMOTIONS } from "../../config";
import { LoggerCreate } from "../../logger";
import { parseLoggerPrefill } from "../../prefill";

/**
 * Route wrapper that opens the logger for a new entry at the rating slide.
 * Optional `prefill` param: see `parseLoggerPrefill`.
 */
export const LogCreate = () => {
  const { dateTime, prefill: prefillParam } = useLocalSearchParams<{
    dateTime: string;
    prefill?: string;
  }>();
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
    <LoggerCreate dateTime={dateTime} initialStep="rating" prefill={prefill} />
  );
};
