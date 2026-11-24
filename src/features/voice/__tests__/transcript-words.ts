import type { HighlightKind } from "../highlights";
import type { VoiceSpan } from "../match-transcript";
import { getTranscriptWords } from "../transcript-words";

const span = (
  text: string,
  word: string,
  kind: HighlightKind,
  id = word
): VoiceSpan<HighlightKind> => {
  const start = text.indexOf(word);
  return { kind, id, start, end: start + word.length };
};

// Words as "plain[hit]" strings, with "@id " before a person's first word.
const render = (text: string, spans: VoiceSpan<HighlightKind>[]) =>
  getTranscriptWords(text, spans).map(
    ({ segments, personId }) =>
      (personId ? `@${personId} ` : "") +
      segments
        .map(({ text: part, isHighlight }) =>
          isHighlight ? `[${part}]` : part
        )
        .join("")
  );

describe("getTranscriptWords", () => {
  it("splits on whitespace and keeps punctuation outside the highlight", () => {
    const text = "Sport with  Alex.";
    expect(
      render(text, [span(text, "Sport", "tag"), span(text, "Alex", "person")])
    ).toEqual(["[Sport]", "with", "@Alex [Alex]."]);
  });

  it("highlights each word of a long name, avatar on the first only", () => {
    const text = "met Jürgen Weber today";
    expect(render(text, [span(text, "Jürgen Weber", "person", "p1")])).toEqual([
      "met",
      "@p1 [Jürgen]",
      "[Weber]",
      "today",
    ]);
  });

  it("keeps a highlight inside a word without spaces", () => {
    const text = "今日は登山に行った";
    expect(render(text, [span(text, "登山", "tag")])).toEqual([
      "今日は[登山]に行った",
    ]);
  });

  it("returns no words for empty text", () => {
    expect(getTranscriptWords("  ", [])).toEqual([]);
  });
});
