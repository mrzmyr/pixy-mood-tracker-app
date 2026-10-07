import noop from "lodash/noop";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import dayjs from "dayjs";
import {
  _resetHistory,
  addRun,
  loadRuns,
  replaceRuns,
  setRunFeedback,
  STORAGE_KEY,
  useCompletedToday,
} from "../history";

const today = dayjs().format("YYYY-MM-DD");

const storedValue = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return JSON.parse(raw ?? "");
};

const storedRuns = async () => {
  const value = await storedValue();
  return value.runs;
};

beforeEach(async () => {
  jest.restoreAllMocks();
  _resetHistory();
  await AsyncStorage.clear();
});

describe("intervention history", () => {
  test("keeps every finished run with its answer across restarts", async () => {
    await addRun({ id: "a", interventionId: "slow_breath" });
    await addRun({ id: "a", interventionId: "slow_breath" });
    await addRun({ id: "b", interventionId: "slow_breath" });
    await setRunFeedback("b", "better");

    _resetHistory();

    expect(await loadRuns()).toEqual([
      {
        id: "a",
        interventionId: "slow_breath",
        date: today,
        completedAt: expect.any(String),
        feedback: null,
      },
      expect.objectContaining({ id: "b", feedback: "better" }),
    ]);
  });

  test("today lists each finished intervention once", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        runs: [
          {
            id: "old",
            interventionId: "body_scan",
            date: "2020-01-01",
            completedAt: "2020-01-01T10:00:00.000Z",
            feedback: null,
          },
        ],
      })
    );

    const hook = await renderHook(() => useCompletedToday());
    await waitFor(() => expect(hook.result.current).toEqual([]));

    await act(() => addRun({ id: "a", interventionId: "worry_check" }));
    await act(() => addRun({ id: "b", interventionId: "worry_check" }));

    expect(hook.result.current).toEqual(["worry_check"]);
    expect(await storedRuns()).toHaveLength(3);
  });

  test("keeps the days stored before the history existed", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: "2020-01-01", completed: ["body_scan"] })
    );

    await addRun({ id: "a", interventionId: "slow_breath" });

    expect(await storedRuns()).toEqual([
      {
        id: "legacy-2020-01-01-body_scan",
        interventionId: "body_scan",
        date: "2020-01-01",
        completedAt: null,
        feedback: null,
      },
      expect.objectContaining({ id: "a", date: today }),
    ]);
  });

  test("never writes after a failed read", async () => {
    jest.spyOn(console, "error").mockImplementation(noop);
    await AsyncStorage.setItem(STORAGE_KEY, "{broken");
    const setItem = jest.spyOn(AsyncStorage, "setItem");
    setItem.mockClear();

    await addRun({ id: "a", interventionId: "slow_breath" });

    expect(setItem).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("{broken");
  });

  test("replacing writes even after a failed read", async () => {
    jest.spyOn(console, "error").mockImplementation(noop);
    await AsyncStorage.setItem(STORAGE_KEY, "{broken");

    await replaceRuns([]);

    expect(await storedValue()).toEqual({ runs: [] });
  });
});
