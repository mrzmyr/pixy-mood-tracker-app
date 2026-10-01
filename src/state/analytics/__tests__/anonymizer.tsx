import { useAnonymizer } from "@/state/analytics/anonymizer";
// oxlint-disable-next-line eslint/no-restricted-imports -- Persisted feature types stay in their modules until storage refactor.
import type { Tag } from "@/features/tags";

const testTags: Tag[] = [
  {
    id: "1",
    title: "test1",
    color: "slate",
  },
  {
    id: "2",
    title: "test2",
    color: "lime",
  },
];

describe("useAnonymizer", () => {
  it("anonymizeTag()", () => {
    const { anonymizeTag } = useAnonymizer();

    expect(anonymizeTag(testTags[0])).toEqual({
      id: "1",
      color: "slate",
      titleLength: 5,
    });
  });
});
