import fs from "node:fs";
import path from "node:path";
import { RATING_KEYS } from "@/constants/ratings";
import { matchTranscript } from "../match-transcript";
import type { VoiceTerm } from "../match-transcript";
import { matchMood } from "../mood-triggers";
import { buildVoiceExample } from "../voice-example";

let table: Record<string, string> = {};

// Translates from the locale table under test, like `t` with `{{name}}`.
const translate = (key: string, options: Record<string, string>) =>
  (table[key] ?? key).replaceAll(
    /\{\{(?<name>\w+)\}\}/gu,
    (_, name: string) => options[name] ?? ""
  );

const LOCALES_DIR = path.join(__dirname, "../../../../assets/locales");

const triggersOf = () =>
  RATING_KEYS.map((rating) => ({
    rating,
    text: table[`voice_mood_${rating}`] ?? "",
  }));

describe("voice example", () => {
  const locales = fs.readdirSync(LOCALES_DIR);

  it.each(locales)(
    "%s: saying the example shows the mood, tag, and person",
    (file) => {
      table = JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, file), "utf-8")
      );
      const terms: VoiceTerm[] = [
        { kind: "tag", id: "tag-1", text: "Sport" },
        { kind: "person", id: "person-1", text: "Anna" },
      ];
      const triggers = triggersOf();
      const example = buildVoiceExample(terms, triggers, translate);

      expect([example, matchMood(example, triggers)?.rating]).toEqual([
        example,
        "good",
      ]);
      expect([
        example,
        matchTranscript(example, terms).map((match) => match.id),
      ]).toEqual([example, ["tag-1", "person-1"]]);
    }
  );

  it("leaves out parts the user has no data for", () => {
    table = JSON.parse(
      fs.readFileSync(path.join(LOCALES_DIR, "en.json"), "utf-8")
    );
    expect(buildVoiceExample([], triggersOf(), translate)).toBe(
      "I feel good today."
    );
  });
});
