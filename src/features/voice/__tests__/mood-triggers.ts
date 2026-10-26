import fs from "node:fs";
import path from "node:path";
import { RATING_KEYS } from "@/constants/ratings";
import { matchMood } from "../mood-triggers";
import type { MoodTrigger } from "../mood-triggers";

const triggers: MoodTrigger[] = [
  { rating: "extremely_good", text: "amazing" },
  { rating: "very_good", text: "very good" },
  { rating: "good", text: "good" },
  { rating: "neutral", text: "so-so" },
  { rating: "bad", text: "not good" },
  { rating: "very_bad", text: "bad" },
  { rating: "extremely_bad", text: "very bad" },
];

describe("matchMood", () => {
  it("sets the mood from a trigger after a feeling verb", () => {
    expect(matchMood("Today I felt bad", triggers)).toBe("very_bad");
    expect(matchMood("I feel amazing", triggers)).toBe("extremely_good");
  });

  it("prefers the longest trigger", () => {
    expect(matchMood("I felt very bad after work", triggers)).toBe(
      "extremely_bad"
    );
    expect(matchMood("honestly very good", triggers)).toBe("very_good");
    expect(matchMood("I felt not good today", triggers)).toBe("bad");
  });

  it("keeps the first mentioned mood", () => {
    expect(
      matchMood("I felt good in the morning, very bad at night", triggers)
    ).toBe("good");
  });

  it("matches spoken forms of hyphenated triggers", () => {
    expect(matchMood("it was so so", triggers)).toBe("neutral");
    expect(matchMood("it was so-so", triggers)).toBe("neutral");
  });

  it("ignores triggers inside other words", () => {
    expect(matchMood("goodbye badminton", triggers)).toBeNull();
  });

  it("returns null without a trigger", () => {
    expect(matchMood("long day at work", triggers)).toBeNull();
    expect(matchMood("", triggers)).toBeNull();
  });
});

const LOCALES_DIR = path.join(__dirname, "../../../../assets/locales");

describe("mood triggers in every app language", () => {
  const locales = fs.readdirSync(LOCALES_DIR);

  it.each(locales)("%s: each spoken trigger sets its own mood", (file) => {
    const table: Record<string, string> = JSON.parse(
      fs.readFileSync(path.join(LOCALES_DIR, file), "utf-8")
    );
    const localeTriggers = RATING_KEYS.map((rating) => ({
      rating,
      text: table[`voice_mood_${rating}`] ?? "",
    }));
    for (const { rating, text } of localeTriggers) {
      expect([text, matchMood(text, localeTriggers)]).toEqual([text, rating]);
    }
  });
});
