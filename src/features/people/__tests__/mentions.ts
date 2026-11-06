import {
  applyDisplayEdit,
  findMentionQuery,
  formatMention,
  getMentionedIds,
  matchMentionCandidates,
  noteToPlainText,
  parseNote,
  serializeNote,
  spliceSegments,
  toDisplayText,
} from "../mentions";

const ada = { id: "ada-1", name: "Ada" };
const jen = { id: "jen-2", name: "Jen" };

describe("parseNote", () => {
  test("round-trips text and mentions", () => {
    const note = `Swim with ${formatMention(ada)} and ${formatMention(jen)}!`;
    const segments = parseNote(note);
    expect(segments).toEqual([
      { type: "text", text: "Swim with " },
      { type: "mention", id: "ada-1", name: "Ada" },
      { type: "text", text: " and " },
      { type: "mention", id: "jen-2", name: "Jen" },
      { type: "text", text: "!" },
    ]);
    expect(serializeNote(segments)).toBe(note);
  });

  test("keeps names with brackets and backslashes intact", () => {
    const person = { id: "x", name: String.raw`Oma [Hilde] \o/` };
    const segments = parseNote(formatMention(person));
    expect(segments).toEqual([{ type: "mention", id: "x", name: person.name }]);
  });

  test("leaves ordinary Markdown links as text", () => {
    const note = "[@site](https://pixy.day)";
    expect(parseNote(note)).toEqual([{ type: "text", text: note }]);
  });
});

test("noteToPlainText and getMentionedIds read mentions", () => {
  const note = `${formatMention(ada)} met ${formatMention(jen)} and ${formatMention(ada)}`;
  expect(noteToPlainText(note)).toBe("Ada met Jen and Ada");
  expect(getMentionedIds(note)).toEqual(["ada-1", "jen-2"]);
});

describe("applyDisplayEdit", () => {
  const segments = parseNote(`Hi ${formatMention(ada)} there`);

  test("typing after a mention keeps it", () => {
    const next = applyDisplayEdit(segments, "Hi @Ada! there");
    expect(serializeNote(next)).toBe(`Hi ${formatMention(ada)}! there`);
  });

  test("typing before a mention keeps it", () => {
    const next = applyDisplayEdit(segments, "Hi, @Ada there");
    expect(serializeNote(next)).toBe(`Hi, ${formatMention(ada)} there`);
  });

  test("deleting into a mention turns it into text", () => {
    const next = applyDisplayEdit(segments, "Hi @Ad there");
    expect(serializeNote(next)).toBe("Hi @Ad there");
  });

  test("typing inside a mention turns it into text", () => {
    const next = applyDisplayEdit(segments, "Hi @Adda there");
    expect(serializeNote(next)).toBe("Hi @Adda there");
  });

  test("replacing everything drops the mention", () => {
    expect(serializeNote(applyDisplayEdit(segments, "new"))).toBe("new");
  });
});

describe("spliceSegments", () => {
  test("replaces a typed query with a mention", () => {
    const segments = parseNote("Swim with @A");
    const next = spliceSegments(segments, 10, 12, [
      { type: "mention", ...ada },
      { type: "text", text: " " },
    ]);
    expect(serializeNote(next)).toBe(`Swim with ${formatMention(ada)} `);
    expect(toDisplayText(next)).toBe("Swim with @Ada ");
  });

  test("inserts between two mentions without breaking them", () => {
    const segments = parseNote(`${formatMention(ada)}${formatMention(jen)}`);
    const next = spliceSegments(segments, 4, 4, [{ type: "text", text: "+" }]);
    expect(serializeNote(next)).toBe(
      `${formatMention(ada)}+${formatMention(jen)}`
    );
  });
});

describe("findMentionQuery", () => {
  test("finds the query at the cursor", () => {
    expect(findMentionQuery(parseNote("Lunch with @Je"), 14)).toEqual({
      start: 11,
      query: "Je",
    });
    expect(findMentionQuery(parseNote("@"), 1)).toEqual({
      start: 0,
      query: "",
    });
  });

  test("ignores @ inside words and after line breaks", () => {
    expect(findMentionQuery(parseNote("mail@pixy"), 9)).toBeNull();
    expect(findMentionQuery(parseNote("@Ada\nnext"), 9)).toBeNull();
  });

  test("ignores a finished mention", () => {
    const segments = parseNote(`Hi ${formatMention(ada)}`);
    expect(findMentionQuery(segments, 7)).toBeNull();
  });

  test("finds a query right after a mention and a space", () => {
    const segments = parseNote(`${formatMention(ada)} @J`);
    expect(findMentionQuery(segments, 7)).toEqual({ start: 5, query: "J" });
  });
});

test("matchMentionCandidates ranks name starts first and skips archived", () => {
  const people = [
    { name: "Oma Hilde" },
    { name: "Hildegard" },
    { name: "Hilde Old", isArchived: true },
    { name: "Tobi" },
  ];
  expect(matchMentionCandidates(people, "hil", 3).map((p) => p.name)).toEqual([
    "Hildegard",
    "Oma Hilde",
  ]);
  expect(matchMentionCandidates(people, "", 2)).toHaveLength(2);
});
