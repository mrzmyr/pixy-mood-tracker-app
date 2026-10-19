import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import {
  checkInTarget,
  INITIAL_CHECK_IN_STATE,
  tapCheckIn,
} from "../check-in-state";
import type {
  CheckInContext,
  CheckInState,
  EntryChange,
} from "../check-in-state";

const emotions = ["happy", "grateful"].map((key) => ({
  key,
  category: "very_good" as const,
  mode: "basic" as const,
  disabled: false,
}));

const createContext = (
  overrides: Partial<CheckInContext> = {}
): CheckInContext => ({
  items: [],
  people: [{ id: "sam", name: "Sam" }],
  tags: [{ id: "work", title: "Work" }],
  emotions,
  now: dayjs("2026-10-18T21:00:00"),
  newId: "entry-1",
  ...overrides,
});

/** Run taps like the app does: apply each change to the stored items. */
const run = (targets: string[], context = createContext()) => {
  let state: CheckInState = INITIAL_CHECK_IN_STATE;
  let items: LogItem[] = [...context.items];
  const changes: EntryChange[] = [];
  for (const target of targets) {
    const result = tapCheckIn(state, target, { ...context, items });
    const { change } = result;
    ({ state } = result);
    changes.push(change);
    if (change?.type === "add") {
      items.push(change.item);
    }
    if (change?.type === "edit") {
      items = items.map((item) =>
        item.id === change.item.id ? { ...item, ...change.item } : item
      );
    }
  }
  return { state, items, changes };
};

describe("tapCheckIn()", () => {
  test("saves the entry on the mood tap and edits it on later taps", () => {
    const { state, items } = run([
      checkInTarget.mood("very_good"),
      checkInTarget.emotion("happy"),
      checkInTarget.influence({ kind: "person", id: "sam" }),
      checkInTarget.next,
      checkInTarget.influence({ kind: "tag", id: "work" }),
      checkInTarget.finish,
    ]);

    expect(state.step).toBe("done");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "entry-1",
      rating: "very_good",
      date: "2026-10-18",
      emotions: ["happy"],
      people: [{ id: "sam" }],
      tags: [{ id: "work" }],
    });
  });

  test("keeps a mood-only entry when the user stops after the mood", () => {
    const { state, items } = run([checkInTarget.mood("bad")]);

    expect(state.step).toBe("emotion");
    expect(items).toMatchObject([{ rating: "bad", emotions: [] }]);
  });

  test("a second tap on a person removes them again", () => {
    const sam = checkInTarget.influence({ kind: "person", id: "sam" });
    const { state, items } = run([
      checkInTarget.mood("very_good"),
      checkInTarget.skipEmotion,
      sam,
      sam,
    ]);

    expect(state.picked).toEqual([]);
    expect(items[0].people).toEqual([]);
  });

  test("asks for people, then tags, in separate steps", () => {
    const afterEmotion = run([
      checkInTarget.mood("very_good"),
      checkInTarget.emotion("happy"),
    ]);
    const afterNext = run([
      checkInTarget.mood("very_good"),
      checkInTarget.emotion("happy"),
      checkInTarget.next,
    ]);

    expect(afterEmotion.state.step).toBe("people");
    expect(afterEmotion.state.peopleSlots.map((slot) => slot.id)).toEqual([
      "sam",
    ]);
    expect(afterNext.state.step).toBe("tags");
    expect(afterNext.state.tagSlots.map((slot) => slot.id)).toEqual(["work"]);
  });

  test("ignores a tag tap on the people step", () => {
    const { state, changes } = run([
      checkInTarget.mood("very_good"),
      checkInTarget.emotion("happy"),
      checkInTarget.influence({ kind: "tag", id: "work" }),
    ]);

    expect(state.picked).toEqual([]);
    expect(changes.at(-1)).toBeNull();
  });

  test("skips the people step without people, and both without tags", () => {
    const noPeople = run(
      [checkInTarget.mood("very_good"), checkInTarget.emotion("happy")],
      createContext({ people: [] })
    );
    const neither = run(
      [checkInTarget.mood("very_good"), checkInTarget.emotion("happy")],
      createContext({ people: [], tags: [] })
    );

    expect(noPeople.state.step).toBe("tags");
    expect(neither.state.step).toBe("done");
  });

  test("ends after people when there are no tags", () => {
    const { state } = run(
      [
        checkInTarget.mood("very_good"),
        checkInTarget.emotion("happy"),
        checkInTarget.next,
      ],
      createContext({ tags: [] })
    );

    expect(state.step).toBe("done");
  });

  test("ignores targets that are not offered in the current step", () => {
    const { state, changes } = run([
      checkInTarget.emotion("happy"),
      checkInTarget.mood("very_good"),
      // Not a slot of this check-in, for example from an older Live Activity.
      checkInTarget.emotion("furious"),
    ]);

    expect(changes).toEqual([
      null,
      expect.objectContaining({ type: "add" }),
      null,
    ]);
    expect(state.step).toBe("emotion");
  });

  test("restarts when the entry was deleted in the app", () => {
    const first = run([checkInTarget.mood("very_good")]);

    const result = tapCheckIn(
      first.state,
      checkInTarget.emotion("happy"),
      createContext({ items: [] })
    );

    expect(result).toEqual({ state: INITIAL_CHECK_IN_STATE, change: null });
  });
});
