import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { CalendarFiltersProvider, useCalendarFilters } from "../filters";
import { LogsProvider, STORAGE_KEY, useLogUpdater } from "@/features/logs";
import type { LogsState } from "@/features/logs";

import { SettingsProvider } from "@/state/settings";
import { _generateItem } from "@/__tests__/utils";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>
        <CalendarFiltersProvider>{children}</CalendarFiltersProvider>
      </LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const _renderHook = () => renderHook(() => useCalendarFilters(), { wrapper });

const testItems: LogsState["items"] = [
  _generateItem({
    date: "2022-01-01",
    rating: "neutral",
    message: "test message 🐶",
    tags: [],
  }),
  _generateItem({
    date: "2022-01-02",
    rating: "good",
    message: "🦄🐶",
    tags: [
      {
        id: "t1",
      },
      {
        id: "t4",
      },
    ],
  }),
  _generateItem({
    date: "2022-01-02",
    rating: "bad",
    message: "🕹",
    tags: [
      {
        id: "t1",
      },
      {
        id: "t3",
      },
    ],
  }),
];

xdescribe("useCalendarFilters()", () => {
  afterEach(async () => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  });

  test("should `set`", async () => {
    const hook = await _renderHook();
    await act(async () => {});

    const { set } = hook.result.current;

    await act(() => {
      set({
        text: "test",
        ratings: ["neutral"],
        tagIds: ["1"],
        personIds: [],
      });
    });

    expect(hook.result.current.data.text).toBe("test");
    expect(hook.result.current.data.ratings).toEqual(["neutral"]);
    expect(hook.result.current.data.tagIds).toEqual(["1"]);
    expect(hook.result.current.data.filterCount).toBe(3);
    expect(hook.result.current.data.isFiltering).toBe(true);
  });

  test("should `reset`", async () => {
    const hook = await _renderHook();
    await act(async () => {});

    const { set, reset } = hook.result.current;

    await act(() => {
      set({
        text: "test",
        ratings: ["neutral"],
        tagIds: ["1"],
        personIds: [],
      });
    });

    await act(() => {
      reset();
    });

    expect(hook.result.current.data.text).toBe("");
    expect(hook.result.current.data.ratings).toEqual([]);
    expect(hook.result.current.data.tagIds).toEqual([]);
    expect(hook.result.current.data.filterCount).toBe(0);
    expect(hook.result.current.data.isFiltering).toBe(false);
  });

  test("should `open`", async () => {
    const hook = await _renderHook();
    await act(async () => {});

    const { open } = hook.result.current;

    await act(() => {
      open();
    });

    expect(hook.result.current.isOpen).toBe(true);
  });

  test("should `close`", async () => {
    const hook = await _renderHook();
    await act(async () => {});

    const { open, close } = hook.result.current;

    await act(() => {
      open();
    });

    await act(() => {
      close();
    });

    expect(hook.result.current.isOpen).toBe(false);
  });

  test("should filter for `ratings`", async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }));

    const hook = await _renderHook();
    await act(async () => {});

    const { set } = hook.result.current;

    await act(() => {
      set({
        text: "",
        ratings: ["good"],
        tagIds: [],
        personIds: [],
      });
    });

    expect(hook.result.current.data.filteredItems).toEqual([testItems[1]]);
  });

  test("should filter for `tags`", async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }));

    const hook = await _renderHook();
    await act(async () => {});

    const { set } = hook.result.current;

    await act(() => {
      set({
        text: "",
        ratings: [],
        tagIds: ["t3"],
        personIds: [],
      });
    });

    expect(hook.result.current.data.filteredItems).toEqual([testItems[2]]);

    await act(() => {
      set({
        text: "",
        ratings: [],
        tagIds: ["t1"],
        personIds: [],
      });
    });

    expect(hook.result.current.data.filteredItems).toEqual([
      testItems[1],
      testItems[2],
    ]);
  });

  test("should filter for `text`", async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }));

    const hook = await _renderHook();
    await act(async () => {});

    const { set } = hook.result.current;

    await act(() => {
      set({
        text: "🐶",
        ratings: [],
        tagIds: [],
        personIds: [],
      });
    });

    expect(hook.result.current.data.filteredItems).toEqual([
      testItems[0],
      testItems[1],
    ]);

    await act(() => {
      set({
        text: "🦄",
        ratings: [],
        tagIds: [],
        personIds: [],
      });
    });

    expect(hook.result.current.data.filteredItems).toEqual([testItems[1]]);
  });

  test("should filter for `text` and `ratings`", async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }));

    const hook = await _renderHook();
    await act(async () => {});

    const { set } = hook.result.current;

    await act(() => {
      set({
        text: "🐶",
        ratings: ["good"],
        tagIds: [],
        personIds: [],
      });
    });

    expect(hook.result.current.data.filteredItems).toEqual([testItems[1]]);
  });

  test("should filter for `text` and `tags`", async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }));

    const hook = await _renderHook();
    await act(async () => {});

    const { set } = hook.result.current;

    await act(() => {
      set({
        text: "🐶",
        ratings: [],
        tagIds: ["t1"],
        personIds: [],
      });
    });

    expect(hook.result.current.data.filteredItems).toEqual([testItems[1]]);
  });
});

// Runs apart from the suite above: that suite seeds AsyncStorage, which
// leaves the provider tree unmounted, so it stays skipped.
describe("useCalendarFilters() keeps filters", () => {
  test("should match entries with any selected person", async () => {
    const hook = await renderHook(
      () => ({ filters: useCalendarFilters(), logs: useLogUpdater() }),
      { wrapper }
    );
    await act(async () => {});
    const sam = _generateItem({ date: "2022-02-01", people: [{ id: "sam" }] });
    const alex = _generateItem({
      date: "2022-02-02",
      people: [{ id: "alex" }],
    });
    const nobody = _generateItem({ date: "2022-02-03", people: [] });

    await act(() => {
      hook.result.current.filters.set({
        text: "",
        ratings: [],
        tagIds: [],
        personIds: ["sam", "alex"],
      });
    });
    await act(() => {
      hook.result.current.logs.updateLogs([sam, alex, nobody]);
    });

    expect(hook.result.current.filters.data.filterCount).toBe(2);
    expect(
      hook.result.current.filters.data.filteredItems.map((item) => item.id)
    ).toEqual([sam.id, alex.id]);
  });

  test("should keep filters on `close`", async () => {
    const hook = await _renderHook();
    await act(async () => {});

    await act(() => {
      hook.result.current.set({
        text: "",
        ratings: ["good"],
        tagIds: [],
        personIds: [],
      });
    });
    await act(() => {
      hook.result.current.open();
    });
    await act(() => {
      hook.result.current.close();
    });

    expect(hook.result.current.isOpen).toBe(false);
    expect(hook.result.current.data.ratings).toEqual(["good"]);
    expect(hook.result.current.data.isFiltering).toBe(true);
    expect(hook.result.current.data.filterCount).toBe(1);
  });

  test("should match entries added while filtering", async () => {
    const hook = await renderHook(
      () => ({ filters: useCalendarFilters(), logs: useLogUpdater() }),
      { wrapper }
    );
    await act(async () => {});

    await act(() => {
      hook.result.current.filters.set({
        text: "",
        ratings: ["good"],
        tagIds: [],
        personIds: [],
      });
    });
    expect(hook.result.current.filters.data.filteredItems).toEqual([]);

    const added = _generateItem({
      date: "2022-01-05",
      rating: "good",
      message: "",
      tags: [],
    });
    await act(() => {
      hook.result.current.logs.addLog(added);
    });

    expect(hook.result.current.filters.data.filteredItems).toEqual([added]);
  });
});
