import { t } from "@/lib/translation";
import type { VoiceTerm } from "./match-transcript";
import type { MoodTrigger } from "./mood-triggers";

type Translate = (
  key: "voice_example_mood" | "voice_example_tag" | "voice_example_person",
  options: Record<string, string>
) => string;

/** Random item. `random` returns [0, 1), like `Math.random`. */
const pick = <T>(items: T[], random: () => number): T | undefined =>
  items[Math.floor(random() * items.length)];

/**
 * Example sentence from the user's own words: the "good" mood trigger, a
 * random tag, and a random person. Each part only when it exists. Saying it
 * makes the cards appear.
 */
export const buildVoiceExample = (
  terms: VoiceTerm[],
  triggers: MoodTrigger[],
  translate: Translate = t,
  random: () => number = Math.random
) => {
  const parts: string[] = [];
  const good = triggers.find((trigger) => trigger.rating === "good");
  if (good) {
    parts.push(translate("voice_example_mood", { mood: good.text }));
  }
  const tag = pick(
    terms.filter((term) => term.kind === "tag"),
    random
  );
  if (tag) {
    parts.push(translate("voice_example_tag", { tag: tag.text }));
  }
  const person = pick(
    terms.filter((term) => term.kind === "person"),
    random
  );
  if (person) {
    parts.push(translate("voice_example_person", { person: person.text }));
  }
  return parts.join(" ");
};

/**
 * Up to `count` different examples, for the voice mode hint that cycles
 * through them. Fewer when the user has few tags and people.
 */
export const buildVoiceExamples = (
  terms: VoiceTerm[],
  triggers: MoodTrigger[],
  count: number,
  random: () => number = Math.random
) => {
  const examples = new Set<string>();
  // A few extra tries: random picks can repeat.
  for (let tries = 0; tries < count * 4 && examples.size < count; tries += 1) {
    examples.add(buildVoiceExample(terms, triggers, t, random));
  }
  return [...examples];
};
