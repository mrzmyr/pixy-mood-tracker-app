import { describe, expect, test } from "bun:test";
import { isSortedDeep, sortKeysDeep } from "./sort-locales";

describe("sort-locales", () => {
  test("sorts nested keys and keeps array order", () => {
    const sorted = sortKeysDeep({
      title: "Title",
      add_entry: "Add Entry",
      add: "Add",
      days: { other: "{{count}} days", one: "one day" },
      steps: ["second", "first"],
    });

    expect(JSON.stringify(sorted)).toBe(
      JSON.stringify({
        add: "Add",
        add_entry: "Add Entry",
        days: { one: "one day", other: "{{count}} days" },
        steps: ["second", "first"],
        title: "Title",
      })
    );
    expect(isSortedDeep(sorted)).toBe(true);
  });

  test("flags unsorted keys at any depth", () => {
    expect(isSortedDeep({ b: "B", a: "A" })).toBe(false);
    expect(isSortedDeep({ a: { other: "x", one: "y" } })).toBe(false);
  });
});
