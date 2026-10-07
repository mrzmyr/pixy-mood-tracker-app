import noop from "lodash/noop";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import dayjs from "dayjs";
import {
  InterventionHistoryProvider,
  useCompletedToday,
  useInterventionHistoryLoad,
  useInterventionHistoryUpdater,
  useInterventionRuns,
} from "../InterventionHistoryProvider";
import { STORAGE_KEY } from "../history";

const today = dayjs().format("YYYY-MM-DD");

const run = {
  id: "old",
  interventionId: "body_scan",
  date: "2020-01-01",
  completedAt: "2020-01-01T10:00:00.000Z",
  feedback: null,
};

const wrapper = ({ children }) => (
  <InterventionHistoryProvider>{children}</InterventionHistoryProvider>
);

const renderHistory = async () => {
  const hook = await renderHook(
    () => ({
      runs: useInterventionRuns(),
      today: useCompletedToday(),
      load: useInterventionHistoryLoad(),
      updater: useInterventionHistoryUpdater(),
    }),
    { wrapper }
  );
  await waitFor(() =>
    expect(hook.result.current.load.status).not.toBe("loading")
  );
  return hook;
};

const storedRaw = () => AsyncStorage.getItem(STORAGE_KEY);

const storedRuns = async () => {
  const raw = await storedRaw();
  return JSON.parse(raw ?? "").runs;
};

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe("intervention history", () => {
  test("keeps every finished run with its answer across restarts", async () => {
    const first = await renderHistory();

    await act(() => {
      first.result.current.updater.addRun({
        id: "a",
        interventionId: "slow_breath",
      });
    });
    await act(() => {
      first.result.current.updater.addRun({
        id: "a",
        interventionId: "slow_breath",
      });
      first.result.current.updater.addRun({
        id: "b",
        interventionId: "slow_breath",
      });
    });
    await act(() => {
      first.result.current.updater.setFeedback("b", "better");
    });
    await waitFor(async () => expect(await storedRuns()).toHaveLength(2));
    await first.unmount();

    const second = await renderHistory();

    expect(second.result.current.runs).toEqual([
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ runs: [run] }));
    const hook = await renderHistory();
    expect(hook.result.current.today).toEqual([]);

    await act(() => {
      hook.result.current.updater.addRun({
        id: "a",
        interventionId: "worry_check",
      });
      hook.result.current.updater.addRun({
        id: "b",
        interventionId: "worry_check",
      });
    });

    expect(hook.result.current.today).toEqual(["worry_check"]);
    await waitFor(async () => expect(await storedRuns()).toHaveLength(3));
  });

  test("keeps the days stored before the history existed", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: "2020-01-01", completed: ["body_scan", "gone"] })
    );

    const hook = await renderHistory();

    expect(hook.result.current.runs).toEqual([
      {
        id: "legacy-2020-01-01-body_scan",
        interventionId: "body_scan",
        date: "2020-01-01",
        completedAt: null,
        feedback: null,
      },
    ]);
  });

  test("drops stored runs of unknown interventions", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        runs: [run, { ...run, id: "x", interventionId: "gone" }],
      })
    );

    const hook = await renderHistory();

    expect(hook.result.current.runs).toEqual([run]);
  });

  test("feedback for an unknown run changes nothing", async () => {
    const stored = JSON.stringify({ runs: [run] });
    await AsyncStorage.setItem(STORAGE_KEY, stored);
    const hook = await renderHistory();

    await act(() => {
      hook.result.current.updater.setFeedback("missing", "better");
    });

    expect(hook.result.current.runs).toEqual([run]);
    expect(await storedRaw()).toBe(stored);
  });

  test.each([
    ["broken JSON", "{broken"],
    ["an unknown shape", "{}"],
    ["runs that are not a list", '{"runs":"x"}'],
  ])("keeps %s in storage and still renders", async (_label, stored) => {
    jest.spyOn(console, "error").mockImplementation(noop);
    await AsyncStorage.setItem(STORAGE_KEY, stored);
    const hook = await renderHistory();
    expect(hook.result.current.load.status).toBe("error");

    await act(() => {
      hook.result.current.updater.addRun({
        id: "a",
        interventionId: "slow_breath",
      });
    });

    expect(hook.result.current.today).toEqual(["slow_breath"]);
    expect(await storedRaw()).toBe(stored);
  });
});
