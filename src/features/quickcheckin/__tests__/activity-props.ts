import {
  getActivityProps,
  getItemWidth,
  MAX_ROWS,
  packRows,
  ROW_WIDTH,
} from "../live-activity/activity-props";
import type { ActivityItem } from "../live-activity/activity-props";
import { checkInTarget, INITIAL_CHECK_IN_STATE } from "../check-in-state";
import type { CheckInState } from "../check-in-state";

const SCALE = "ColorBrew-RdYlGn";

const person = (id: string, label: string) => ({
  kind: "person" as const,
  id,
  label,
  color: "",
});

const tag = (id: string, label: string) => ({
  kind: "tag" as const,
  id,
  label,
  color: "blue",
});

const people: CheckInState = {
  ...INITIAL_CHECK_IN_STATE,
  step: "people",
  entryId: "entry-1",
  rating: "very_bad",
  peopleSlots: [person("sam", "Sam"), person("alex", "Alex")],
  tagSlots: [tag("work", "Work")],
  picked: ["person:sam"],
};

const chipItem = (label: string): ActivityItem => ({
  kind: "chip",
  target: `emotion:${label}`,
  label,
  isSelected: false,
  isPrivate: false,
  dot: "#000000",
  isPerson: false,
  image: "",
});

const flat = (rows: ActivityItem[][]) => rows.flat();

describe("getActivityProps()", () => {
  test("offers the moods worst first, like the prototype row", () => {
    const props = getActivityProps({
      state: INITIAL_CHECK_IN_STATE,
      scaleType: SCALE,
      todayRatings: [],
    });
    expect(props.moods.map((mood) => mood.target)).toEqual([
      checkInTarget.mood("extremely_bad"),
      checkInTarget.mood("very_bad"),
      checkInTarget.mood("bad"),
      checkInTarget.mood("neutral"),
      checkInTarget.mood("good"),
      checkInTarget.mood("very_good"),
      checkInTarget.mood("extremely_good"),
    ]);
  });

  test("people step: only people, picked marked, More then Next to tags", () => {
    const items = flat(
      getActivityProps({ state: people, scaleType: SCALE, todayRatings: [] })
        .rows
    );
    expect(items.map((item) => [item.kind, item.target])).toEqual([
      ["chip", checkInTarget.influence(person("sam", "Sam"))],
      ["chip", checkInTarget.influence(person("alex", "Alex"))],
      ["more", ""],
      ["action", checkInTarget.next],
    ]);
    expect(items[0]).toMatchObject({
      isSelected: true,
      isPrivate: true,
      isPerson: true,
    });
  });

  test("shows a person's photo when there is one, else the symbol", () => {
    const items = flat(
      getActivityProps({
        state: people,
        scaleType: SCALE,
        todayRatings: [],
        thumbs: { sam: "sam.jpg" },
        imageDirectory: "file:///shared/",
      }).rows
    );
    expect(items.slice(0, 2).map((item) => item.image)).toEqual([
      "sam.jpg",
      "",
    ]);
  });

  test("people step saves directly when there are no tags", () => {
    const items = flat(
      getActivityProps({
        state: { ...people, tagSlots: [] },
        scaleType: SCALE,
        todayRatings: [],
      }).rows
    );
    expect(items.at(-1)?.target).toBe(checkInTarget.finish);
  });

  test("tags step: tags with their color, then More and Save", () => {
    const items = flat(
      getActivityProps({
        state: { ...people, step: "tags" },
        scaleType: SCALE,
        todayRatings: [],
      }).rows
    );
    expect(items.map((item) => item.kind)).toEqual(["chip", "more", "action"]);
    expect(items[0].dot).not.toBe("");
    expect(items[2].target).toBe(checkInTarget.finish);
  });

  test("keeps the last 8 entries of today in the strip, oldest first", () => {
    const props = getActivityProps({
      state: INITIAL_CHECK_IN_STATE,
      scaleType: SCALE,
      todayRatings: [
        "bad",
        "good",
        "good",
        "good",
        "good",
        "good",
        "good",
        "good",
        "extremely_good",
      ],
    });
    const reference = getActivityProps({
      state: INITIAL_CHECK_IN_STATE,
      scaleType: SCALE,
      todayRatings: ["good", "extremely_good"],
    });
    expect(props.today).toHaveLength(8);
    expect(props.today[0]).toBe(reference.today[0]);
    expect(props.today[7]).toBe(reference.today[1]);
  });

  test("never repeats the rating on a hard day: the summary lists picks only", () => {
    const props = getActivityProps({
      state: { ...people, step: "done", picked: ["person:sam", "tag:work"] },
      scaleType: SCALE,
      todayRatings: ["very_bad"],
    });
    expect(props.doneDetail).toBe("Sam · Work");
    expect(props.doneTitle).not.toBe("");
  });
});

describe("packRows()", () => {
  const more: ActivityItem = { ...chipItem("More…"), kind: "more", dot: "" };

  test("fills rows in rank order and ends with More", () => {
    const chips = ["Happy", "Calm", "Grateful", "Hopeful", "Proud"].map(
      chipItem
    );
    const rows = packRows(chips, [more]);
    const items = flat(rows);
    expect(items.map((item) => item.label)).toEqual([
      "Happy",
      "Calm",
      "Grateful",
      "Hopeful",
      "Proud",
      "More…",
    ]);
    expect(rows.length).toBeGreaterThan(1);
  });

  test("never exceeds the row width or row count; drops the lowest ranked", () => {
    const chips = Array.from({ length: 30 }, (_, index) =>
      chipItem(`Feeling ${index}`)
    );
    const rows = packRows(chips, [more]);
    expect(rows.length).toBeLessThanOrEqual(MAX_ROWS);
    for (const row of rows) {
      const width = row.reduce(
        (sum, item, index) => sum + getItemWidth(item) + (index > 0 ? 6 : 0),
        0
      );
      expect(width).toBeLessThanOrEqual(ROW_WIDTH);
    }
    const labels = flat(rows).map((item) => item.label);
    expect(labels[0]).toBe("Feeling 0");
    expect(labels.at(-1)).toBe("More…");
    expect(labels.length).toBeLessThan(31);
  });
});
