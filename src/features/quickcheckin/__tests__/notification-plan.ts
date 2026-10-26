import dayjs from "dayjs";
import { _generateItem } from "@/testing/log-item";
import { getInboxChanges } from "../notification/notification-plan";
import type { InboxEntry } from "../notification/notification-plan";

const snapshot = (overrides: Partial<InboxEntry> = {}): InboxEntry => ({
  id: "entry-1",
  createdAt: "2026-10-18T19:00:00.000Z",
  rating: "good",
  emotions: ["calm"],
  people: [{ id: "sam" }],
  tags: [{ id: "work" }],
  ...overrides,
});

const context = {
  people: [{ id: "sam" }],
  tags: [{ id: "work" }],
  emotions: [{ key: "calm" }],
};

describe("getInboxChanges()", () => {
  test("adds an entry the app does not know yet, at the tap time", () => {
    const [change] = getInboxChanges([snapshot()], { ...context, items: [] });

    expect(change).toMatchObject({
      type: "add",
      item: {
        id: "entry-1",
        rating: "good",
        dateTime: dayjs("2026-10-18T19:00:00.000Z").toISOString(),
        emotions: ["calm"],
        people: [{ id: "sam" }],
        tags: [{ id: "work" }],
        message: "",
      },
    });
  });

  test("edits the entry when an earlier import already added it", () => {
    const items = [_generateItem({ id: "entry-1", message: "kept" })];

    expect(getInboxChanges([snapshot()], { ...context, items })).toEqual([
      {
        type: "edit",
        item: {
          id: "entry-1",
          rating: "good",
          emotions: ["calm"],
          people: [{ id: "sam" }],
          tags: [{ id: "work" }],
        },
      },
    ]);
  });

  test("drops people, tags, and emotions that no longer exist", () => {
    const [change] = getInboxChanges(
      [
        snapshot({
          emotions: ["gone"],
          people: [{ id: "sam" }, { id: "deleted" }],
          tags: [{ id: "removed" }],
        }),
      ],
      { ...context, items: [] }
    );

    expect(change?.item).toMatchObject({
      emotions: [],
      people: [{ id: "sam" }],
      tags: [],
    });
  });

  test("skips snapshots with an unknown rating or time", () => {
    expect(
      getInboxChanges(
        [
          snapshot({ rating: "amazing" }),
          snapshot({ createdAt: "not a date" }),
        ],
        { ...context, items: [] }
      )
    ).toEqual([]);
  });
});
