import { useMemo } from "react";
import { EMOTIONS } from "@/features/logger";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import type { VoiceTerm } from "./match-transcript";

/**
 * Words voice mode listens for: active tags, active people, and enabled
 * emotions by their label in the app language.
 */
export const useVoiceTerms = (): VoiceTerm[] => {
  const { tags } = useTagsState();
  const { people } = usePeopleState();

  return useMemo(() => {
    const terms: VoiceTerm[] = [];
    for (const person of people) {
      if (!person.isArchived) {
        terms.push({ kind: "person", id: person.id, text: person.name });
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
  }, [people, tags]);
};
