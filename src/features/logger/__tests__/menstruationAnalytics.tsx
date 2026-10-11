import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  LogsProvider,
  useLogLoad,
  useLogState,
  STORAGE_KEY as LOGS_STORAGE_KEY,
} from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { MenstruationFlowSchema } from "@/types";
import { LogDraftProvider, useLogDraft } from "../logDraft";
import { useLoggerActions } from "../hooks/useLoggerActions";

// oxlint-disable-next-line anti-slop/no-module-mocking -- navigator guard needs a real stack, covered by useDiscardGuard tests.
jest.mock("@/hooks/useDiscardGuard", () => ({
  useDiscardGuard: () => ({ allowLeave: jest.fn() }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
  );
  jest.clearAllMocks();
  jest.spyOn(router, "back").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test.each([...MenstruationFlowSchema.options, undefined])(
  "saving %s sends presence only",
  async (flow) => {
    const item = _generateItem({
      menstruation: flow === undefined ? undefined : { flow },
    });
    const hook = await renderHook(
      () => ({
        actions: useLoggerActions({ mode: "create", onCreated: () => {} }),
        settingsLoad: useSettingsLoad(),
        logsLoad: useLogLoad(),
        logs: useLogState(),
      }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SettingsProvider>
            <AnalyticsProvider options={{ enabled: true }}>
              <LogsProvider>
                <LogDraftProvider initialDraft={item}>
                  {children}
                </LogDraftProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        ),
      }
    );
    await waitFor(() => {
      expect(hook.result.current.settingsLoad.status).toBe("ready");
      expect(hook.result.current.logsLoad.status).toBe("ready");
    });
    await act(() => hook.result.current.actions.save());
    const capture = getPostHogTestClient()?.capture;
    expect(capture).toHaveBeenCalledWith(
      "logger:log_saved",
      expect.objectContaining({ has_menstruation: flow !== undefined })
    );
    if (!capture) {
      return;
    }
    const properties = jest
      .mocked(capture)
      .mock.calls.find(([name]) => name === "logger:log_saved")?.[1];
    expect(properties).not.toHaveProperty("flow");
    expect(properties).not.toHaveProperty("menstruation");
    expect(
      Object.keys(properties ?? {}).filter((key) =>
        key.includes("menstruation")
      )
    ).toEqual(["has_menstruation"]);
    expect(hook.result.current.logs.items[0].menstruation).toEqual(
      item.menstruation
    );
  }
);

test("deselecting an edit removes persisted daily flow", async () => {
  const item = _generateItem({ menstruation: { flow: "none" } });
  await AsyncStorage.setItem(
    LOGS_STORAGE_KEY,
    JSON.stringify({ items: [item] })
  );
  const hook = await renderHook(
    () => ({
      actions: useLoggerActions({ mode: "edit" }),
      draft: useLogDraft(),
      settingsLoad: useSettingsLoad(),
      logsLoad: useLogLoad(),
      logs: useLogState(),
    }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <LogsProvider>
              <LogDraftProvider initialDraft={item}>
                {children}
              </LogDraftProvider>
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
    }
  );
  await waitFor(() => {
    expect(hook.result.current.settingsLoad.status).toBe("ready");
    expect(hook.result.current.logsLoad.status).toBe("ready");
  });
  await act(() => {
    hook.result.current.draft.setMenstruationFlow(null);
    hook.result.current.actions.save();
  });
  expect(hook.result.current.logs.items[0].menstruation).toBeUndefined();
  await waitFor(async () => {
    const stored = JSON.parse(
      (await AsyncStorage.getItem(LOGS_STORAGE_KEY)) ?? "{}"
    );
    expect(stored.items[0]).not.toHaveProperty("menstruation");
  });
  expect(getPostHogTestClient()?.capture).toHaveBeenCalledWith(
    "logger:log_saved",
    expect.objectContaining({ has_menstruation: false })
  );
});

test.each(["create", "edit"] as const)(
  "%s refuses a duplicate daily value without writing or tracking a save",
  async (mode) => {
    const draft = _generateItem({ menstruation: { flow: "light" } });
    const owner = _generateItem({
      dateTime: draft.dateTime,
      menstruation: { flow: "none" },
    });
    const items =
      mode === "edit"
        ? [owner, { ...draft, menstruation: undefined }]
        : [owner];
    await AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify({ items }));
    const hook = await renderHook(
      () => ({
        actions: useLoggerActions({ mode, onCreated: () => {} }),
        draft: useLogDraft(),
        settingsLoad: useSettingsLoad(),
        logsLoad: useLogLoad(),
        logs: useLogState(),
      }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SettingsProvider>
            <AnalyticsProvider options={{ enabled: true }}>
              <LogsProvider>
                <LogDraftProvider initialDraft={draft}>
                  {children}
                </LogDraftProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        ),
      }
    );
    await waitFor(() => {
      expect(hook.result.current.settingsLoad.status).toBe("ready");
      expect(hook.result.current.logsLoad.status).toBe("ready");
    });
    await act(() => {
      hook.result.current.draft.setMenstruationFlow("heavy");
      hook.result.current.actions.save();
    });
    expect(hook.result.current.logs.items).toEqual(items);
    expect(hook.result.current.draft.isDirty).toBe(true);
    expect(router.back).not.toHaveBeenCalled();
    expect(getPostHogTestClient()?.capture).not.toHaveBeenCalledWith(
      "logger:log_saved",
      expect.anything()
    );
  }
);
