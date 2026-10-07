import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import { _generateItem } from "@/__tests__/utils";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_KEY,
  useLogState,
} from "@/features/logs";
import {
  PeopleProvider,
  STORAGE_KEY as PEOPLE_KEY,
  usePeopleState,
} from "@/features/people";
import {
  STORAGE_KEY as TAGS_KEY,
  TagsProvider,
  useTagsState,
} from "@/features/tags";
import {
  _resetInterventionHistory,
  INTERVENTIONS_STORAGE_KEY as INTERVENTIONS_KEY,
} from "@/features/interventions";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettings,
} from "@/state/settings";
import { useAppData } from "../appData";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>
        <TagsProvider>
          <PeopleProvider>{children}</PeopleProvider>
        </TagsProvider>
      </LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const renderAppData = () =>
  renderHook(
    () => ({
      appData: useAppData(),
      items: useLogState().items,
      tags: useTagsState().tags,
      people: usePeopleState().people,
      settings: useSettings().settings,
    }),
    { wrapper }
  );

const _console_error = console.error;

describe("useAppData()", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    _resetInterventionHistory();
    console.error = jest.fn();
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
  });

  afterEach(() => {
    console.error = _console_error;
    jest.restoreAllMocks();
  });

  test("is ready once every store loaded", async () => {
    const hook = await renderAppData();

    await waitFor(() => {
      expect(hook.result.current.appData.load.status).toBe("ready");
    });
  });

  test("resetAll leaves default data after a restart", async () => {
    await AsyncStorage.multiSet([
      [
        LOGS_KEY,
        JSON.stringify({
          items: [_generateItem({ date: "2022-01-01", rating: "good" })],
        }),
      ],
      [
        TAGS_KEY,
        JSON.stringify({ tags: [{ id: "x", title: "Mine", color: "red" }] }),
      ],
      [
        PEOPLE_KEY,
        JSON.stringify({
          people: [
            {
              id: "p",
              name: "Sam",
              avatar: null,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ],
      [
        INTERVENTIONS_KEY,
        JSON.stringify({
          runs: [
            {
              id: "run",
              interventionId: "slow_breath",
              date: "2026-01-01",
              completedAt: "2026-01-01T10:00:00.000Z",
              feedback: "better",
            },
          ],
        }),
      ],
      [
        SETTINGS_KEY,
        JSON.stringify({
          ...INITIAL_STATE,
          deviceId: "old-device",
          actionsDone: [{ title: "onboarding", date: "2026-01-01" }],
        }),
      ],
    ]);
    const first = await renderAppData();
    await waitFor(() => {
      expect(first.result.current.appData.load.status).toBe("ready");
    });
    expect(first.result.current.items).toHaveLength(1);

    await act(() => {
      first.result.current.appData.resetAll();
    });
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(LOGS_KEY)) ?? "")).toEqual({
        items: [],
      });
    });
    await first.unmount();

    const second = await renderAppData();
    await waitFor(() => {
      expect(second.result.current.appData.load.status).toBe("ready");
    });

    expect(second.result.current.items).toEqual([]);
    expect(second.result.current.people).toEqual([]);
    expect(second.result.current.tags.map((tag) => tag.id)).not.toContain("x");
    expect(second.result.current.tags.length).toBeGreaterThan(0);
    expect(second.result.current.settings).toEqual({
      ...INITIAL_STATE,
      deviceId: expect.any(String),
    });
    expect(second.result.current.settings.deviceId).not.toBe("old-device");
    expect(
      JSON.parse((await AsyncStorage.getItem(INTERVENTIONS_KEY)) ?? "")
    ).toEqual({ runs: [] });
  });

  test("snapshot and replaceAll carry the intervention history", async () => {
    const run = {
      id: "run",
      interventionId: "slow_breath" as const,
      date: "2026-01-01",
      completedAt: "2026-01-01T10:00:00.000Z",
      feedback: "better" as const,
    };
    await AsyncStorage.setItem(
      INTERVENTIONS_KEY,
      JSON.stringify({ runs: [run] })
    );
    const hook = await renderAppData();
    await waitFor(() => {
      expect(hook.result.current.appData.load.status).toBe("ready");
    });

    const backup = await hook.result.current.appData.snapshot();
    expect(backup.interventions).toEqual([run]);

    await act(() =>
      hook.result.current.appData.replaceAll({ ...backup, interventions: [] })
    );
    expect(
      JSON.parse((await AsyncStorage.getItem(INTERVENTIONS_KEY)) ?? "")
    ).toEqual({ runs: [] });
  });
});
