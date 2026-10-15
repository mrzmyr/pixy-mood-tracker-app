import { useMemo } from "react";
import { EMOTIONS } from "@/features/logger";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { useFeatureFlag } from "@/state/featureFlags";
import type { VoiceTerm } from "./matchTranscript";

/**
 * Words voice mode listens for: active tags, active people (flag `people`),
 * and enabled emotions by their label in the app language.
 */
export const useVoiceTerms = (): VoiceTerm[] => {
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const hasPeople = useFeatureFlag("people");

  return useMemo(() => {
    const terms: VoiceTerm[] = [];
    if (hasPeople) {
      for (const person of people) {
        if (!person.isArchived) {
          terms.push({ kind: "person", id: person.id, text: person.name });
        }
      }
    }
    for (const tag of tags) {
      if (!tag.isArchived) {
        terms.push({ kind: "tag", id: tag.id, text: tag.title });
      }
    }
    for (const emotion of EMOTIONS) {
      if (!emotion.disabled) {
        terms.push({ kind: "emotion", id: emotion.key, text: emotion.label });
      }
    }
    return terms;
  }, [hasPeople, people, tags]);
};
