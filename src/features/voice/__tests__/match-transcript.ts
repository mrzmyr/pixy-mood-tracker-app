import { matchTranscript } from "../match-transcript";
import type { VoiceTerm } from "../match-transcript";

const anna: VoiceTerm = { kind: "person", id: "p-anna", text: "Anna" };
const work: VoiceTerm = { kind: "tag", id: "t-work", text: "Work" };
const stressed: VoiceTerm = {
  kind: "emotion",
  id: "stressed",
  text: "Stressed",
};
const leftOut: VoiceTerm = {
  kind: "emotion",
  id: "left_out",
  text: "Left out",
};
const out: VoiceTerm = { kind: "tag", id: "t-out", text: "Out" };

const ids = (transcript: string, terms: VoiceTerm[]) =>
  matchTranscript(transcript, terms).map((match) => match.id);

describe("matchTranscript", () => {
  it("finds people, tags, and emotions in order of first mention", () => {
    expect(
      ids("Long day at work. Called Anna later, felt stressed.", [
        stressed,
        anna,
        work,
      ])
    ).toEqual(["t-work", "p-anna", "stressed"]);
  });

  it("ignores case and accents", () => {
    const rene: VoiceTerm = { kind: "person", id: "p-rene", text: "René" };
    expect(ids("met RENE and was STRESSED", [rene, stressed])).toEqual([
      "p-rene",
      "stressed",
    ]);
  });

  it("matches whole words only", () => {
    expect(ids("Annabelle reworked her homework", [anna, work])).toEqual([]);
  });

  it("matches multi word terms and prefers the longest term", () => {
    expect(ids("I felt left out today", [out, leftOut])).toEqual(["left_out"]);
    expect(ids("went out, felt left out", [out, leftOut])).toEqual([
      "t-out",
      "left_out",
    ]);
  });

  it("returns each item once", () => {
    expect(ids("Anna, Anna and Anna again", [anna])).toEqual(["p-anna"]);
  });

  it("keeps two kinds that share one word", () => {
    const workEmotion: VoiceTerm = {
      kind: "emotion",
      id: "work",
      text: "work",
    };
    expect(ids("work", [work, workEmotion])).toEqual(["t-work", "work"]);
  });

  it("ignores names it does not know", () => {
    expect(ids("met Lisa for coffee", [anna, work])).toEqual([]);
  });

  it("matches inside scripts without spaces", () => {
    const tired: VoiceTerm = { kind: "emotion", id: "tired", text: "疲れた" };
    expect(ids("今日はとても疲れた", [tired])).toEqual(["tired"]);
  });

  it("returns nothing for an empty transcript or empty terms", () => {
    expect(ids("   ", [anna])).toEqual([]);
    expect(ids("Anna", [{ kind: "tag", id: "t-empty", text: " " }])).toEqual(
      []
    );
  });
});
