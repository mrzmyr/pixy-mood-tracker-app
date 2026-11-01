import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { PostHog } from "posthog-react-native";
import { INITIAL_STATE } from "@/constants/settings";
import { ConsentPostHogProvider } from "@/shell/consent-posthog-provider";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";

// oxlint-disable-next-line anti-slop/no-module-mocking -- TRACKING_ENABLED is off in Jest; this suite tests the consent gate itself
jest.mock("@/constants/config", () => ({
  __esModule: true,
  ...jest.requireActual("@/constants/config"),
  TRACKING_ENABLED: true,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <ConsentPostHogProvider>{children}</ConsentPostHogProvider>
  </SettingsProvider>
);

const ONBOARDED = [{ title: "onboarding", date: "2026-10-01T10:00:00.000Z" }];

const renderWithSettings = async (
  analyticsEnabled: boolean,
  actionsDone = ONBOARDED
) => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, analyticsEnabled, actionsDone })
  );
  const hook = await renderHook(
    () => ({ settings: useSettings(), load: useSettingsLoad() }),
    { wrapper }
  );
  await waitFor(() => {
    expect(hook.result.current.load.status).toBe("ready");
  });
  return hook;
};

const disabledValues = () =>
  jest.mocked(PostHog).mock.calls.map(([, options]) => options?.disabled);

describe("ConsentPostHogProvider", () => {
  beforeEach(async () => {
    jest.mocked(PostHog).mockClear();
    await AsyncStorage.clear();
  });

  test("creates only a disabled client while consent is off", async () => {
    await renderWithSettings(false);

    expect(disabledValues()).not.toContain(false);
  });

  test("creates only a disabled client before onboarding is done", async () => {
    await renderWithSettings(true, []);

    expect(disabledValues()).not.toContain(false);
  });

  test("creates an enabled client once settings load with consent on", async () => {
    await renderWithSettings(true);

    expect(disabledValues()[0]).toBe(true);
    expect(disabledValues().at(-1)).toBe(false);
  });

  test("creates an enabled client when the user turns consent on", async () => {
    const hook = await renderWithSettings(false);

    await act(() => {
      hook.result.current.settings.setSettings((settings) => ({
        ...settings,
        analyticsEnabled: true,
      }));
    });

    expect(disabledValues().at(-1)).toBe(false);
  });
});
