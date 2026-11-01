import { t } from "@/lib/translation";
import type { VoiceTerm } from "./match-transcript";
import type { MoodTrigger } from "./mood-triggers";

type Translate = (
  key: "voice_example_mood" | "voice_example_tag" | "voice_example_person",
  options: Record<string, string>
) => string;

/**
 * Example sentence from the user's own words: the "good" mood trigger, their
 * first tag, and their first person. Each part only when it exists. Saying
 * it makes the cards appear.
 */
export const buildVoiceExample = (
  terms: VoiceTerm[],
  triggers: MoodTrigger[],
  translate: Translate = t
) => {
  const parts: string[] = [];
  const good = triggers.find((trigger) => trigger.rating === "good");
  if (good) {
    parts.push(translate("voice_example_mood", { mood: good.text }));
  }
  const tag = terms.find((term) => term.kind === "tag");
  if (tag) {
    parts.push(translate("voice_example_tag", { tag: tag.text }));
  }
  const person = terms.find((term) => term.kind === "person");
  if (person) {
    parts.push(translate("voice_example_person", { person: person.text }));
  }
  return parts.join(" ");
};
