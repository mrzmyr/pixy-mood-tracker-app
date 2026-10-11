import noop from "lodash/noop";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import dayjs from "dayjs";
import {
  _resetCompleted,
  markCompleted,
  STORAGE_KEY,
  useCompletedToday,
} from "../completed";

const today = dayjs().format("YYYY-MM-DD");

beforeEach(async () => {
  jest.restoreAllMocks();
  _resetCompleted();
  await AsyncStorage.clear();
});

describe("completed interventions", () => {
  test("keeps finished interventions of today across restarts", async () => {
    await markCompleted("slow_breath");
    await markCompleted("slow_breath");

    _resetCompleted();
    const hook = await renderHook(() => useCompletedToday());

    await waitFor(() => expect(hook.result.current).toEqual(["slow_breath"]));
  });

  test("a new day starts empty and replaces the stored day", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: "2020-01-01", completed: ["body_scan"] })
    );

    const hook = await renderHook(() => useCompletedToday());
    await waitFor(() => expect(hook.result.current).toEqual([]));

    await act(() => markCompleted("worry_check"));
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "")).toEqual(
      { date: today, completed: ["worry_check"] }
    );
  });

  test("never writes after a failed read", async () => {
    jest.spyOn(console, "error").mockImplementation(noop);
    await AsyncStorage.setItem(STORAGE_KEY, "{broken");
    const setItem = jest.spyOn(AsyncStorage, "setItem");
    setItem.mockClear();

    await markCompleted("slow_breath");

    expect(setItem).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("{broken");
  });
});
