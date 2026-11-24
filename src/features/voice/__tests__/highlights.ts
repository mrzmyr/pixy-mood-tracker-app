import { findHighlights } from "../highlights";
import type { VoiceTerm } from "../match-transcript";
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

const terms: VoiceTerm[] = [
  { kind: "person", id: "p1", text: "Jürgen Weber" },
  { kind: "person", id: "p2", text: "Jonas" },
  { kind: "tag", id: "t1", text: "Klettern" },
  { kind: "emotion", id: "stressed", text: "stressed" },
];

// Highlighted words as they stand in the transcript.
const highlighted = (text: string, list = terms) =>
  findHighlights(text, list, triggers).map(({ kind, start, end }) => [
    kind,
    text.slice(start, end),
  ]);

describe("findHighlights", () => {
  it("marks the spoken words, not the stored term", () => {
    expect(highlighted("Heute mit JURGEN beim klettern, war schön")).toEqual([
      ["person", "JURGEN"],
      ["tag", "klettern"],
    ]);
  });

  it("marks every mention of a term", () => {
    expect(highlighted("Jonas called. Later Jonas came over")).toEqual([
      ["person", "Jonas"],
      ["person", "Jonas"],
    ]);
  });

  it("marks only the first mood, the one that sets the rating", () => {
    expect(highlighted("I feel good, later it got bad")).toEqual([
      ["mood", "good"],
    ]);
  });

  it("marks the longest mood trigger", () => {
    expect(highlighted("honestly not good today")).toEqual([
      ["mood", "not good"],
    ]);
  });

  it("keeps places right after emoji and repeated separators", () => {
    expect(highlighted("🎉🎉 so ... stressed!! Jonas?")).toEqual([
      ["emotion", "stressed"],
      ["person", "Jonas"],
    ]);
  });

  it("marks a full name across a line of punctuation", () => {
    expect(highlighted("met jürgen-weber? no: Jürgen   Weber")).toEqual([
      ["person", "jürgen-weber"],
      ["person", "Jürgen   Weber"],
    ]);
  });

  it("marks words in scripts without spaces", () => {
    const list: VoiceTerm[] = [{ kind: "tag", id: "t", text: "登山" }];
    expect(highlighted("今日は登山に行った", list)).toEqual([["tag", "登山"]]);
  });

  it("lets a longer mood trigger beat a shorter term", () => {
    const list: VoiceTerm[] = [{ kind: "emotion", id: "good", text: "Good" }];
    expect(highlighted("I feel very good, good day", list)).toEqual([
      ["mood", "very good"],
      ["emotion", "good"],
    ]);
  });

  it("drops a mood trigger inside a longer term", () => {
    const list: VoiceTerm[] = [{ kind: "tag", id: "t", text: "good food" }];
    expect(highlighted("good food tonight", list)).toEqual([
      ["tag", "good food"],
    ]);
  });
});
