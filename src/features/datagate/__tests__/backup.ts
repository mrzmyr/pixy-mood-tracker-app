import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import { toExportSettings } from "@/state/settings/exportSettings";
import { decodeBackup, encodeBackup } from "../backup";
import type { Backup } from "../backup";

const backup: Backup = {
  items: [
    _generateItem({
      date: "2026-01-01",
      rating: "good",
      tags: [{ id: "t1" }],
      people: [{ id: "p1" }],
      photos: [
        {
          id: "photo",
          fileName: "photo.jpg",
          width: 10,
          height: 20,
          createdAt: "2026-01-01T10:00:00.000Z",
          source: "library",
        },
      ],
    }),
  ],
  tags: [{ id: "t1", title: "Work", color: "blue", categoryId: "c1" }],
  tagCategories: [
    { id: "general", title: "General" },
    { id: "c1", title: "Job" },
  ],
  people: [
    {
      id: "p1",
      name: "Sam",
      avatar: { base64: "AAAA", mime: "image/jpeg" },
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  settings: toExportSettings({
    ...INITIAL_STATE,
    deviceId: "device",
    actionsDone: [{ title: "onboarding", date: "2026-01-01T00:00:00.000Z" }],
  }),
};

describe("backup codec", () => {
  test("decodes what it encodes", () => {
    expect(decodeBackup(encodeBackup(backup, "9.9.9"))).toEqual({
      ok: true,
      version: "9.9.9",
      backup,
    });
  });

  test("never writes device-bound settings into the file", () => {
    const { settings } = JSON.parse(encodeBackup(backup, "9.9.9"));

    expect(settings).not.toHaveProperty("deviceId");
    expect(settings).not.toHaveProperty("storeReviewPromptedAt");
    expect(settings).not.toHaveProperty("photosDayAccessDismissed");
  });

  test("migrates a legacy export to the current format", () => {
    const legacy = {
      items: {
        "2022-01-02": {
          date: "2022-01-02",
          rating: "neutral",
          message: "",
          tags: [{ id: "old" }],
        },
      },
      settings: {
        actionsDone: [],
        tags: [{ id: "old", title: "Old", color: "stone" }],
      },
    };

    const result = decodeBackup(JSON.stringify(legacy));

    expect(result).toEqual({
      ok: true,
      version: "1.0.0",
      backup: {
        items: [expect.objectContaining({ date: "2022-01-02", people: [] })],
        tags: [{ id: "old", title: "Old", color: "slate" }],
        tagCategories: [],
        people: [],
        settings: { actionsDone: [] },
      },
    });
  });

  test.each([
    ["🐇", "invalid_json"],
    ["null", "invalid_schema"],
    ['{"items":"nope","settings":{"actionsDone":[]}}', "invalid_schema"],
    [
      '{"items":[{"date":"2022-1-1","rating":"good","tags":[]}],"settings":{"actionsDone":[]}}',
      "invalid_schema",
    ],
  ])("rejects %s as %s", (raw, reason) => {
    expect(decodeBackup(raw)).toEqual({ ok: false, reason });
  });
});
