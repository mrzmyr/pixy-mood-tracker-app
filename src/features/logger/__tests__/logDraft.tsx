import { act, renderHook } from "@testing-library/react-native";
import { _generateItem } from "@/__tests__/utils";
import type { LogItem } from "@/features/logs";
import { finalizeDraft } from "../finalizeDraft";
import type { LogDraft } from "../finalizeDraft";
import { LogDraftProvider, useLogDraft } from "../logDraft";

const DAY = "2026-10-02";

const BERLIN = { latitude: 52.52, longitude: 13.405, name: "Mitte, Berlin" };
const HAMBURG = { latitude: 53.551, longitude: 9.993, name: "Hamburg" };

const createDraft = (overrides: Partial<LogDraft> = {}): LogDraft => ({
  ..._generateItem({ dateTime: `${DAY}T12:00:00`, message: "" }),
  rating: null,
  sleep: { quality: null },
  ...overrides,
});

const entriesOnDay = (count: number): LogItem[] => [
  // Another day never counts.
  _generateItem({ dateTime: "2026-10-01T12:00:00" }),
  ...Array.from({ length: count }, (_, index) =>
    _generateItem({ dateTime: `${DAY}T0${index + 1}:00:00` })
  ),
];

describe("finalizeDraft()", () => {
  test("stores an unrated draft as neutral and keeps the draft unchanged", () => {
    const draft = createDraft();

    const { item, hasRating } = finalizeDraft(draft, []);

    expect(item.rating).toBe("neutral");
    expect(hasRating).toBe(false);
    expect(draft.rating).toBeNull();
  });

  test("keeps the picked rating", () => {
    const { item, hasRating } = finalizeDraft(
      createDraft({ rating: "very_good" }),
      []
    );

    expect(item.rating).toBe("very_good");
    expect(hasRating).toBe(true);
  });

  test("keeps a null sleep quality", () => {
    const { item } = finalizeDraft(createDraft(), []);

    expect(item.sleep.quality).toBeNull();
  });

  test.each([
    { count: 0, closeTo: "back" },
    { count: 1, closeTo: "calendar" },
    { count: 2, closeTo: "back" },
  ])(
    "closes to $closeTo with $count other entries that day",
    ({ count, closeTo }) => {
      expect(finalizeDraft(createDraft(), entriesOnDay(count)).closeTo).toBe(
        closeTo
      );
    }
  );

  test("does not count the edited entry itself", () => {
    const draft = createDraft();
    const stored = _generateItem({ id: draft.id, dateTime: draft.dateTime });

    expect(finalizeDraft(draft, [stored, ...entriesOnDay(1)]).closeTo).toBe(
      "calendar"
    );
  });
});

const renderDraft = (initialDraft: LogDraft) =>
  renderHook(() => useLogDraft(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <LogDraftProvider initialDraft={initialDraft}>
        {children}
      </LogDraftProvider>
    ),
  });

describe("useLogDraft()", () => {
  test("setDateTime moves the day with the time", async () => {
    const hook = await renderDraft(createDraft());

    await act(() => {
      hook.result.current.setDateTime("2026-09-30T23:30:00");
    });

    expect(hook.result.current.draft).toEqual(
      expect.objectContaining({
        dateTime: "2026-09-30T23:30:00",
        date: "2026-09-30",
      })
    );
  });

  test("commit includes a rating set in the same event", async () => {
    const hook = await renderDraft(createDraft());

    let committed: ReturnType<typeof finalizeDraft> | undefined;
    await act(() => {
      hook.result.current.setRating("bad");
      committed = hook.result.current.commit([]);
    });

    expect(committed?.item.rating).toBe("bad");
  });

  test("an edit keeps fields it does not touch", async () => {
    const hook = await renderDraft(
      createDraft({ sleep: { quality: "very_good" } })
    );

    await act(() => {
      hook.result.current.setMessage("After edit");
    });

    expect(hook.result.current.draft).toEqual(
      expect.objectContaining({
        message: "After edit",
        sleep: { quality: "very_good" },
      })
    );
    expect(hook.result.current.isDirty).toBe(true);
  });

  test("emotions and photos count as content", async () => {
    const hook = await renderDraft(createDraft());
    expect(hook.result.current.hasContent).toBe(false);

    await act(() => {
      hook.result.current.setEmotions(["accomplished"]);
    });
    expect(hook.result.current.hasContent).toBe(true);

    await act(() => {
      hook.result.current.discard();
    });
    expect(hook.result.current.hasContent).toBe(false);
    expect(hook.result.current.isDirty).toBe(false);

    await act(() => {
      hook.result.current.setPhotos([
        {
          id: "photo-1",
          fileName: "photo-1.jpg",
          width: 1,
          height: 1,
          createdAt: `${DAY}T10:00:00.000Z`,
          source: "library",
        },
      ]);
    });
    expect(hook.result.current.hasContent).toBe(true);
  });

  test("a passive location fills the draft without making it dirty", async () => {
    const hook = await renderDraft(createDraft());

    await act(() => {
      hook.result.current.prefillLocation(BERLIN);
    });

    expect(hook.result.current.draft.location).toEqual(BERLIN);
    expect(hook.result.current.isDirty).toBe(false);
    expect(hook.result.current.commit([]).item.location).toEqual(BERLIN);
  });

  test("a passive location never replaces the user's pick", async () => {
    const hook = await renderDraft(createDraft());

    await act(() => {
      hook.result.current.setLocation(HAMBURG);
      hook.result.current.prefillLocation(BERLIN);
    });
    expect(hook.result.current.draft.location).toEqual(HAMBURG);

    await act(() => {
      hook.result.current.setLocation(undefined);
      hook.result.current.prefillLocation(BERLIN);
    });
    expect(hook.result.current.draft.location).toBeUndefined();
    expect(hook.result.current.isDirty).toBe(true);
  });

  test("a passive location keeps the stored location of an edit", async () => {
    const hook = await renderDraft(createDraft({ location: HAMBURG }));

    await act(() => {
      hook.result.current.prefillLocation(BERLIN);
    });

    expect(hook.result.current.draft.location).toEqual(HAMBURG);
  });
});
