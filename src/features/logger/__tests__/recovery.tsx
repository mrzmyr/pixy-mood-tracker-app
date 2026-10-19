import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useLocalSearchParams,
} from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import { Alert, AppState, Text } from "react-native";
import type { AlertButton, AppStateStatus } from "react-native";
import { _generateItem } from "@/testing/log-item";
import Colors from "@/constants/colors";
import { INITIAL_STATE } from "@/constants/settings";
import { AppLockProvider } from "@/features/applock";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsContext } from "@/state/feature-flags/context";
import {
  LOGGER_RECOVERY_KEY,
  loadLoggerRecovery,
  saveLoggerRecovery,
} from "@/state/logger-recovery";
import type { LoggerRecovery } from "@/state/logger-recovery";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
} from "@/state/settings";
import { LoggerRecoveryPrompt } from "..";
import type { LogDraft } from "../finalize-draft";
import { LogDraftProvider, useLogDraft } from "../log-draft";
import { getRestoredDraft } from "../recovery/restored-draft";
import { useRecoverySnapshot } from "../recovery/use-recovery-snapshot";

const THEME = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, ...Colors.light },
};

const createDraft = (overrides: Partial<LogDraft> = {}): LogDraft => ({
  ..._generateItem({ dateTime: "2026-10-19T09:41:00.000Z", message: "" }),
  id: "draft-1",
  rating: null,
  sleep: { quality: null },
  ...overrides,
});

const createRecovery = (
  overrides: Partial<LoggerRecovery> = {}
): LoggerRecovery => ({
  version: 1,
  mode: "create",
  step: "message",
  savedAt: "2026-10-19T09:42:00.000Z",
  draft: createDraft({ message: "half a thought" }),
  ...overrides,
});

let appStateHandlers: ((state: AppStateStatus) => void)[] = [];

const changeAppState = (state: AppStateStatus) => {
  for (const handler of appStateHandlers) {
    handler(state);
  }
};

beforeEach(async () => {
  await AsyncStorage.clear();
  appStateHandlers = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, handler) => {
    appStateHandlers.push(handler);
    return {
      remove: () => {
        appStateHandlers = appStateHandlers.filter((item) => item !== handler);
      },
    };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const renderSnapshot = () =>
  renderHook(
    () => {
      const logDraft = useLogDraft();
      useRecoverySnapshot({ mode: "create", step: "message" });
      return logDraft;
    },
    {
      wrapper: ({ children }) => (
        <LogDraftProvider initialDraft={createDraft()}>
          {children}
        </LogDraftProvider>
      ),
    }
  );

describe("useRecoverySnapshot()", () => {
  test("stores typed note text when the app goes to the background", async () => {
    const { result } = await renderSnapshot();

    await act(() => result.current.typeMessage("half a thought"));
    await act(() => changeAppState("background"));

    await waitFor(async () =>
      expect(await loadLoggerRecovery()).toMatchObject({
        mode: "create",
        step: "message",
        draft: { id: "draft-1", message: "half a thought" },
      })
    );
  });

  test("stores nothing for an untouched draft", async () => {
    await renderSnapshot();

    await act(() => changeAppState("background"));

    expect(await AsyncStorage.getItem(LOGGER_RECOVERY_KEY)).toBeNull();
  });

  test("removes the snapshot when the app comes back", async () => {
    const { result } = await renderSnapshot();
    await act(() => result.current.setRating("good"));
    await act(() => changeAppState("background"));
    await waitFor(async () =>
      expect(await loadLoggerRecovery()).not.toBeNull()
    );

    await act(() => changeAppState("active"));

    await waitFor(async () => expect(await loadLoggerRecovery()).toBeNull());
  });

  test("removes the snapshot when the logger closes", async () => {
    const { result, unmount } = await renderSnapshot();
    await act(() => result.current.setRating("good"));
    await act(() => changeAppState("background"));
    await waitFor(async () =>
      expect(await loadLoggerRecovery()).not.toBeNull()
    );

    await act(() => unmount());

    await waitFor(async () => expect(await loadLoggerRecovery()).toBeNull());
  });
});

const RestoredRoute = () => {
  const { restore, step } = useLocalSearchParams<{
    restore?: string;
    step?: string;
  }>();
  const restored = getRestoredDraft(restore);
  return <Text>{`restored ${restored?.draft.message} at ${step}`}</Text>;
};

const EditRoute = () => {
  const { id, restore } = useLocalSearchParams<{
    id: string;
    restore?: string;
  }>();
  return (
    <Text>{`edit ${id}: ${getRestoredDraft(restore)?.draft.message}`}</Text>
  );
};

const pressButton = async (
  alert: jest.SpyInstance,
  text: "Continue" | "Discard"
) => {
  const buttons: AlertButton[] = alert.mock.calls[0][2];
  await act(() => buttons.find((button) => button.text === text)?.onPress?.());
};

const NO_FLAGS = { flags: {}, isLoading: false };

const renderPrompt = async ({
  recovery,
  entries = [],
}: {
  recovery?: LoggerRecovery;
  entries?: ReturnType<typeof _generateItem>[];
}) => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_STATE));
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify({ items: entries }));
  if (recovery) {
    await saveLoggerRecovery(recovery);
  }
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await renderRouter(
    {
      _layout: () => (
        <ThemeProvider value={THEME}>
          <SettingsProvider>
            <AnalyticsProvider>
              <FeatureFlagsContext.Provider value={NO_FLAGS}>
                <AppLockProvider>
                  <LogsProvider>
                    <LoggerRecoveryPrompt />
                    <Stack />
                  </LogsProvider>
                </AppLockProvider>
              </FeatureFlagsContext.Provider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      ),
      index: () => <Text>home</Text>,
      "logs/create/[dateTime]": RestoredRoute,
      "logs/[id]/edit": EditRoute,
    },
    { initialUrl: "/" }
  );
  // `renderRouter` turns on fake timers; storage reads below need real ones.
  jest.useRealTimers();
  return alert;
};

describe("LoggerRecoveryPrompt", () => {
  test("continues a killed new entry at its slide", async () => {
    const alert = await renderPrompt({ recovery: createRecovery() });

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    await pressButton(alert, "Continue");

    expect(
      await screen.findByText("restored half a thought at message")
    ).toBeTruthy();
    await waitFor(async () => expect(await loadLoggerRecovery()).toBeNull());
  });

  test("continues a killed edit of a stored entry", async () => {
    const entry = { ..._generateItem({}), id: "draft-1" };
    const alert = await renderPrompt({
      recovery: createRecovery({ mode: "edit" }),
      entries: [entry],
    });

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    await pressButton(alert, "Continue");

    expect(
      await screen.findByText("edit draft-1: half a thought")
    ).toBeTruthy();
  });

  test("discards the snapshot and stays on the current screen", async () => {
    const alert = await renderPrompt({ recovery: createRecovery() });

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    await pressButton(alert, "Discard");

    await waitFor(async () => expect(await loadLoggerRecovery()).toBeNull());
    expect(screen.getByText("home")).toBeTruthy();
  });

  test("drops an edit snapshot whose entry is gone without asking", async () => {
    const alert = await renderPrompt({
      recovery: createRecovery({ mode: "edit" }),
    });

    await waitFor(async () => expect(await loadLoggerRecovery()).toBeNull());
    expect(alert).not.toHaveBeenCalled();
  });

  test("drops a new-entry snapshot that was already saved without asking", async () => {
    const alert = await renderPrompt({
      recovery: createRecovery(),
      entries: [{ ..._generateItem({}), id: "draft-1" }],
    });

    await waitFor(async () => expect(await loadLoggerRecovery()).toBeNull());
    expect(alert).not.toHaveBeenCalled();
  });

  test("keeps an invalid snapshot and does not ask", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await AsyncStorage.setItem(LOGGER_RECOVERY_KEY, JSON.stringify({ x: 1 }));
    const alert = await renderPrompt({});

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({ status: "logger_recovery_invalid" })
      )
    );

    expect(alert).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(LOGGER_RECOVERY_KEY)).toBe(
      JSON.stringify({ x: 1 })
    );
  });
});
