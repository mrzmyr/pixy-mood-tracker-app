import { act, renderHook } from "@testing-library/react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import { decodeBackup, encodeBackup } from "@/features/datagate";
import { createCsv } from "../../datagate/csv";
import { MenstruationFlowSchema } from "@/types";
import { finalizeDraft, getMenstruationConflict } from "../finalizeDraft";
import { LogDraftProvider, useLogDraft } from "../logDraft";
import {
  getAvailableStepsForCreate,
  getAvailableStepsForEdit,
  hasMenstruationOnDate,
} from "../steps";

// SAFETY: legacy skipped sleep stores null quality; test fixture mirrors persisted entries.
const item = _generateItem({
  date: "2026-10-11",
  dateTime: "2026-10-11T12:00:00",
  message: "",
  tags: [],
  emotions: [],
  sleep: { quality: null as never },
});
const options = {
  hasStep: () => true,
  hasSleepOnDay: false,
  hasPeople: false,
  isPhotosEnabled: false,
  isMenstruationEnabled: true,
};

const getCreateSteps = ({
  hasMenstruationOnDay = false,
  isMenstruationEnabled = true,
  isStepEnabled = true,
} = {}) =>
  getAvailableStepsForCreate({
    ...options,
    question: null,
    reminderEnabled: true,
    itemsCount: 5,
    hasMenstruationOnDay,
    isMenstruationEnabled,
    hasStep: () => isStepEnabled,
  });

const renderDraft = (flow?: "none" | "light") =>
  renderHook(() => useLogDraft(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <LogDraftProvider
        initialDraft={{ ...item, menstruation: flow ? { flow } : undefined }}
      >
        {children}
      </LogDraftProvider>
    ),
  });

describe("daily menstruation", () => {
  test("create offers flow after sleep only with flag and step on", () => {
    expect(getCreateSteps().slice(0, 3)).toEqual([
      "rating",
      "sleep",
      "menstruation",
    ]);
    expect(getCreateSteps({ isStepEnabled: false })).not.toContain(
      "menstruation"
    );
    expect(getCreateSteps({ isMenstruationEnabled: false })).not.toContain(
      "menstruation"
    );
    expect(getCreateSteps({ hasMenstruationOnDay: true })).not.toContain(
      "menstruation"
    );
  });

  test.each(MenstruationFlowSchema.options)(
    "%s holds the daily value until its entry is deleted",
    (flow) => {
      const stored = { ...item, menstruation: { flow } };
      expect(hasMenstruationOnDate([stored], item.date)).toBe(true);
      expect(hasMenstruationOnDate([stored], "2026-10-12")).toBe(false);
      expect(hasMenstruationOnDate([item], item.date)).toBe(false);
      expect(hasMenstruationOnDate([], item.date)).toBe(false);
      expect(
        getAvailableStepsForEdit({
          ...options,
          item: stored,
          hasStep: () => false,
        })
      ).toContain("menstruation");
      expect(getAvailableStepsForEdit({ ...options, item })).not.toContain(
        "menstruation"
      );
      expect(
        getAvailableStepsForEdit({
          ...options,
          item: stored,
          isMenstruationEnabled: false,
        })
      ).not.toContain("menstruation");
    }
  );

  test("skip keeps the field absent", () => {
    expect(finalizeDraft(item, []).item).not.toHaveProperty("menstruation");
  });

  test("explicit none counts as content and commits in the same event", async () => {
    const hook = await renderDraft();
    let committed;
    await act(() => {
      hook.result.current.setMenstruationFlow("none");
      committed = hook.result.current.commit([]).item;
    });
    expect(committed).toHaveProperty("menstruation.flow", "none");
    expect(hook.result.current.hasContent).toBe(true);
  });

  test("deselect removes field; discard restores original value", async () => {
    const hook = await renderDraft("light");
    await act(() => hook.result.current.setMenstruationFlow(null));
    let committed;
    await act(() => {
      committed = hook.result.current.commit([]).item;
    });
    expect(committed).not.toHaveProperty("menstruation");
    expect(hook.result.current.hasContent).toBe(false);
    await act(() => hook.result.current.discard());
    expect(hook.result.current.draft.menstruation).toEqual({ flow: "light" });
    expect(hook.result.current.isDirty).toBe(false);
  });

  test.each(MenstruationFlowSchema.options)(
    "export/import preserves %s without a flag or backfill",
    (flow) => {
      const items = [
        { ...item, menstruation: { flow } },
        _generateItem({ date: "2026-10-12" }),
      ];
      const result = decodeBackup(
        encodeBackup(
          { items, tags: [], people: [], settings: INITIAL_STATE },
          "1.95.2"
        )
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.backup.items[0].menstruation).toEqual({ flow });
        expect(result.backup.items[1]).not.toHaveProperty("menstruation");
      }
      const rows = createCsv({ items, tags: [] }).trim().split("\r\n");
      expect(rows[0].split(",").slice(-2)).toEqual([
        '"sleep_quality"',
        '"menstruation_flow"',
      ]);
      expect(rows[1].split(",").at(-1)).toBe(`"${flow}"`);
      expect(rows[2].split(",").at(-1)).toBe('""');
    }
  );

  test("import rejects unsupported flow", () => {
    const raw = JSON.stringify({
      items: [{ ...item, menstruation: { flow: "super_heavy" } }],
      tags: [],
      settings: INITIAL_STATE,
    });
    expect(decodeBackup(raw)).toEqual({ ok: false, reason: "invalid_schema" });
  });
});

test("date changes and overlapping creates cannot overwrite another daily value", () => {
  const stored = {
    ...item,
    id: "other-entry",
    menstruation: { flow: "none" as const },
  };
  const draft = { ...item, menstruation: { flow: "light" as const } };
  expect(getMenstruationConflict({ draft, items: [stored] })).toMatchObject({
    status: "menstruation_day_conflict",
    message: expect.any(String),
    why: expect.any(String),
    fix: expect.any(String),
  });
  expect(
    getMenstruationConflict({
      draft: { ...draft, dateTime: "2026-10-12T12:00:00" },
      items: [stored],
    })
  ).toBeNull();
  expect(getMenstruationConflict({ draft: item, items: [stored] })).toBeNull();
  expect(
    getMenstruationConflict({ draft, items: [{ ...stored, id: draft.id }] })
  ).toBeNull();
});

test("daily conflict check sees a selection in the same event", async () => {
  const hook = await renderDraft();
  let conflict;
  await act(() => {
    hook.result.current.setMenstruationFlow("none");
    conflict = hook.result.current.getMenstruationConflict([
      { ...item, id: "other", menstruation: { flow: "light" } },
    ]);
  });
  expect(conflict).toHaveProperty("status", "menstruation_day_conflict");
  expect(hook.result.current.isDirty).toBe(true);
});
