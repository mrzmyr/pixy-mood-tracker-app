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

  describe("people by first or last name", () => {
    const annaSchmidt: VoiceTerm = {
      kind: "person",
      id: "p-anna-schmidt",
      text: "Anna Schmidt",
    };
    const annaMeyer: VoiceTerm = {
      kind: "person",
      id: "p-anna-meyer",
      text: "Anna Meyer",
    };

    it("matches a person by full, first, or last name", () => {
      expect(ids("Called Anna Schmidt", [annaSchmidt])).toEqual([
        "p-anna-schmidt",
      ]);
      expect(ids("Called Anna", [annaSchmidt])).toEqual(["p-anna-schmidt"]);
      expect(ids("Schmidt texted me", [annaSchmidt])).toEqual([
        "p-anna-schmidt",
      ]);
    });

    it("shows the full name for a match by first name", () => {
      expect(matchTranscript("met anna", [annaSchmidt])).toEqual([
        { kind: "person", id: "p-anna-schmidt", text: "Anna Schmidt" },
      ]);
    });

    it("ignores case and accents in name parts", () => {
      const muller: VoiceTerm = {
        kind: "person",
        id: "p-muller",
        text: "Jürgen Müller",
      };
      expect(ids("talked to MULLER", [muller])).toEqual(["p-muller"]);
      expect(ids("talked to jurgen", [muller])).toEqual(["p-muller"]);
    });

    it("matches name parts as whole words only", () => {
      expect(ids("Annabelle and the Schmidtke family", [annaSchmidt])).toEqual(
        []
      );
    });

    it("does not guess when a first name fits several people", () => {
      expect(ids("Called Anna", [annaSchmidt, annaMeyer])).toEqual([]);
    });

    it("resolves a shared first name with the full or last name", () => {
      expect(ids("Called Anna Meyer", [annaSchmidt, annaMeyer])).toEqual([
        "p-anna-meyer",
      ]);
      expect(ids("Meyer called", [annaSchmidt, annaMeyer])).toEqual([
        "p-anna-meyer",
      ]);
    });

    it("prefers a person whose full name is the spoken word", () => {
      expect(ids("Called Anna", [annaSchmidt, anna])).toEqual(["p-anna"]);
    });

    it("lets a full tag or emotion win over a name part", () => {
      const joyMiller: VoiceTerm = {
        kind: "person",
        id: "p-joy-miller",
        text: "Joy Miller",
      };
      const joy: VoiceTerm = { kind: "emotion", id: "joy", text: "Joy" };
      expect(ids("felt joy", [joyMiller, joy])).toEqual(["joy"]);
      expect(ids("Miller brought joy", [joyMiller, joy])).toEqual([
        "p-joy-miller",
        "joy",
      ]);
    });

    it("ignores name parts shorter than three letters", () => {
      const initial: VoiceTerm = {
        kind: "person",
        id: "p-anna-s",
        text: "Anna S.",
      };
      const li: VoiceTerm = { kind: "person", id: "p-li-wei", text: "Li Wei" };
      expect(ids("it's a good day", [initial, li])).toEqual([]);
      expect(ids("li said hi", [li])).toEqual([]);
      expect(ids("Li Wei said hi", [li])).toEqual(["p-li-wei"]);
    });

    it("keeps a hyphenated first name together", () => {
      const hansPeter: VoiceTerm = {
        kind: "person",
        id: "p-hans-peter",
        text: "Hans-Peter Weber",
      };
      expect(ids("met Hans-Peter", [hansPeter])).toEqual(["p-hans-peter"]);
      expect(ids("met Hans", [hansPeter])).toEqual([]);
    });

    it("matches name parts inside scripts without spaces", () => {
      const yamada: VoiceTerm = {
        kind: "person",
        id: "p-yamada",
        text: "山田 太郎",
      };
      const wang: VoiceTerm = { kind: "person", id: "p-wang", text: "王 小明" };
      expect(ids("今日は山田さんと話した", [yamada])).toEqual(["p-yamada"]);
      expect(ids("国王の話", [wang])).toEqual([]);
    });

    it("does not split names of tags or emotions", () => {
      expect(ids("felt left", [leftOut])).toEqual([]);
    });
  });
});
