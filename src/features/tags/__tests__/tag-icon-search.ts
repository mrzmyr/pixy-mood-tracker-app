import { parseModelSuggestion } from "../apple-intelligence";
import { buildTagIconPickerRows } from "../tag-icon-picker-rows";
import { rankTagIcons } from "../tag-icon-search";
import { suggestTagIcons } from "../use-tag-icon-suggestions";
import { TAG_ICON_CATEGORIES } from "../tag-icons";

const iconsOf = (rows: ReturnType<typeof buildTagIconPickerRows>) =>
  rows.flatMap((row) =>
    row.type === "icons" ? row.cells.map((cell) => cell.icon) : []
  );

describe("tag icon suggestions without Apple Intelligence", () => {
  test.each([
    ["Gym", "gym"],
    ["Coffee with Anna", "coffee"],
    ["Headache", "sick"],
    ["Birthday party", "party"],
    ["Therapy", "brain"],
    ["Sex", "couple"],
  ])("%s suggests %s first", (name, icon) => {
    expect(rankTagIcons(name)[0]).toBe(icon);
  });

  test("a name without a known word suggests nothing", () => {
    expect(rankTagIcons("Xyzzy")).toEqual([]);
    expect(rankTagIcons("  ")).toEqual([]);
  });

  test.each([
    ["Gym", "orange"],
    ["Coffee with Anna", "amber"],
    ["Xyzzy", undefined],
  ])("%s guesses color %s from the best icon", async (name, color) => {
    const suggestion = await suggestTagIcons(name);
    expect(suggestion.color).toBe(color);
  });
});

describe("Apple Intelligence output", () => {
  test("keeps known icons and color from the schema JSON, in order", () => {
    expect(
      parseModelSuggestion(
        '{"icons":["coffee","rocketship","tea","coffee"],"color":"amber"}'
      )
    ).toEqual({ icons: ["coffee", "tea"], color: "amber" });
  });

  test("drops an unknown color", () => {
    expect(
      parseModelSuggestion('{"icons":["gym"],"color":"beige"}').color
    ).toBeUndefined();
  });

  test("reads known icon and color names from plain text", () => {
    expect(parseModelSuggestion("icons: [gym, run], color: green")).toEqual({
      icons: ["gym", "run"],
      color: "green",
    });
  });
});

describe("icon picker rows", () => {
  test("an empty name shows categories only", () => {
    const rows = buildTagIconPickerRows({
      query: "",
      title: "",
      suggestions: [],
      isSuggesting: false,
    });

    expect(rows[0]).toMatchObject({ type: "header", sectionId: "feelings" });
    expect(iconsOf(rows)).toHaveLength(
      TAG_ICON_CATEGORIES.reduce(
        (sum, category) => sum + category.icons.length,
        0
      )
    );
  });

  test("suggestions come first and show placeholders while loading", () => {
    const loading = buildTagIconPickerRows({
      query: "",
      title: "Gym",
      suggestions: [],
      isSuggesting: true,
    });
    const loaded = buildTagIconPickerRows({
      query: "",
      title: "Gym",
      suggestions: ["gym", "run"],
      isSuggesting: false,
    });

    expect(loading[0]).toMatchObject({ sectionId: "suggestions" });
    expect(loading[1]).toMatchObject({ type: "icons" });
    expect(iconsOf(loading.slice(0, 2)).every((icon) => icon === null)).toBe(
      true
    );
    expect(iconsOf(loaded.slice(0, 2))).toEqual(["gym", "run"]);
  });

  test("a name without suggestions shows no Suggestions section", () => {
    const rows = buildTagIconPickerRows({
      query: "",
      title: "Xyzzy",
      suggestions: [],
      isSuggesting: false,
    });

    expect(rows[0]).toMatchObject({ type: "header", sectionId: "feelings" });
  });

  test("search shows matches, or an empty row", () => {
    const hits = buildTagIconPickerRows({
      query: "swim",
      title: "",
      suggestions: [],
      isSuggesting: false,
    });
    const none = buildTagIconPickerRows({
      query: "xyzzy",
      title: "",
      suggestions: [],
      isSuggesting: false,
    });

    expect(iconsOf(hits)).toContain("swim");
    expect(none.map((row) => row.type)).toEqual(["header", "empty"]);
  });
});
