import { useState } from "react";
import { EMOTIONS, parseLoggerPrefill } from "@/features/logger";
import type { LoggerPrefill } from "@/features/logger";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";

/**
 * Call `apply` once per new `prefill` route param from voice mode. Drops
 * archived tags and people, and disabled emotions. Invalid params are
 * ignored.
 */
export const useVoicePrefill = (
  prefill: string | undefined,
  apply: (parsed: LoggerPrefill) => void
) => {
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const [applied, setApplied] = useState<string>();

  if (!prefill || prefill === applied) {
    return;
  }
  setApplied(prefill);
  const parsed = parseLoggerPrefill(prefill, {
    tags: tags.flatMap((tag) => (tag.isArchived ? [] : [tag.id])),
    people: people.flatMap((person) => (person.isArchived ? [] : [person.id])),
    emotions: EMOTIONS.flatMap((emotion) =>
      emotion.disabled ? [] : [emotion.key]
    ),
  });
  if (parsed) {
    apply(parsed);
  }
};
