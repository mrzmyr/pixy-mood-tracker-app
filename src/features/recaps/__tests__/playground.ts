import { getPlaygroundFixture, toPlaygroundData } from "@/dev/playground-data";
import { getPlaygroundPages } from "../story/playground-pages";

/** Pages of `deck` from the playground fixture, none without it. */
const pagesOf = (deck: string) => {
  const fixture = getPlaygroundFixture();
  return fixture
    ? getPlaygroundPages(deck, toPlaygroundData(fixture), false)
    : [];
};

/** Ids under `key` (one id) and `${key}s` (a list) anywhere in `json`. */
const idsOf = (json: string, key: string) => {
  const one = new RegExp(`"${key}":"(?<id>[^"]+)"`, "gu");
  const list = new RegExp(`"${key}s":\\[(?<ids>[^\\]]*)\\]`, "gu");
  return [
    ...[...json.matchAll(one)].map((match) => match.groups?.id ?? ""),
    ...[...json.matchAll(list)].flatMap((match) =>
      [...(match.groups?.ids ?? "").matchAll(/"(?<id>[^"]+)"/gu)].map(
        (id) => id.groups?.id ?? ""
      )
    ),
  ];
};

describe("recap story playground", () => {
  test("every slide state names only tags and people its context knows", () => {
    const pages = pagesOf("all");

    expect(pages.length).toBeGreaterThan(0);
    for (const { slide, ctx, label } of pages) {
      const json = JSON.stringify(slide);
      const missing = [
        ...idsOf(json, "tagId").filter((id) => !ctx.tags.has(id)),
        ...idsOf(json, "personId").filter((id) => !ctx.people.has(id)),
      ];
      expect({ label, missing }).toEqual({ label, missing: [] });
    }
  });

  test("the fixture still makes a month story", () => {
    expect(pagesOf("month").length).toBeGreaterThan(3);
  });
});
