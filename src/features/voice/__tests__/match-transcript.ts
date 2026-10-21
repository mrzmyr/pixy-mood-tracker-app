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

  describe("German language support", () => {
    it("matches German terms with umlauts", () => {
      const muede: VoiceTerm = { kind: "emotion", id: "tired", text: "Müde" };
      const gluecklich: VoiceTerm = {
        kind: "emotion",
        id: "happy",
        text: "Glücklich",
      };
      const ueberwaeltigt: VoiceTerm = {
        kind: "emotion",
        id: "overwhelmed",
        text: "Überwältigt",
      };

      expect(ids("Heute bin ich müde", [muede])).toEqual(["tired"]);
      expect(ids("Ich fühle mich glücklich", [gluecklich])).toEqual(["happy"]);
      expect(
        ids("War etwas überwältigt heute", [ueberwaeltigt])
      ).toEqual(["overwhelmed"]);
    });

    it("matches German compound words", () => {
      const arbeitsstress: VoiceTerm = {
        kind: "tag",
        id: "t-work-stress",
        text: "Arbeitsstress",
      };
      const familienleben: VoiceTerm = {
        kind: "tag",
        id: "t-family-life",
        text: "Familienleben",
      };

      expect(ids("Viel Arbeitsstress heute", [arbeitsstress])).toEqual([
        "t-work-stress",
      ]);
      expect(ids("Schönes Familienleben genossen", [familienleben])).toEqual([
        "t-family-life",
      ]);
    });

    it("matches German plural and singular forms independently", () => {
      const freund: VoiceTerm = { kind: "person", id: "p-friend", text: "Freund" };
      const freunde: VoiceTerm = { kind: "tag", id: "t-friends", text: "Freunde" };

      expect(ids("Mit Freund unterwegs", [freund, freunde])).toEqual([
        "p-friend",
      ]);
      expect(ids("Mit Freunden unterwegs", [freund, freunde])).toEqual([
        "t-friends",
      ]);
      expect(ids("Freund und andere Freunde", [freund, freunde])).toEqual([
        "p-friend",
        "t-friends",
      ]);
    });

    it("ignores case for German terms with umlauts", () => {
      const muede: VoiceTerm = { kind: "emotion", id: "tired", text: "Müde" };

      expect(ids("Heute bin ich MÜDE", [muede])).toEqual(["tired"]);
      expect(ids("heute bin ich müde", [muede])).toEqual(["tired"]);
      expect(ids("Heute bin ich MüDe", [muede])).toEqual(["tired"]);
    });

    it("matches German terms with ß (eszett)", () => {
      const stress: VoiceTerm = { kind: "emotion", id: "stressed", text: "Gestresst" };
      const gross: VoiceTerm = { kind: "emotion", id: "great", text: "Großartig" };

      expect(ids("Ich bin gestresst", [stress])).toEqual(["stressed"]);
      expect(ids("Das war großartig", [gross])).toEqual(["great"]);
    });

    it("does not match partial German words", () => {
      const arbeit: VoiceTerm = { kind: "tag", id: "t-work", text: "Arbeit" };
      const tag: VoiceTerm = { kind: "tag", id: "t-day", text: "Tag" };

      expect(ids("Arbeiten heute", [arbeit])).toEqual([]);
      expect(ids("Tagebuch geschrieben", [tag])).toEqual([]);
    });
  });
});
