import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { userEvent, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Platform, Text } from "react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsProvider } from "@/state/featureFlags";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { DataScreen } from "../screens/Data";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const mockReloadFlags = jest.mocked(
  getPostHogTestClient().reloadFeatureFlagsAsync
);

const Layout = () => (
  <SettingsProvider>
    <AnalyticsProvider>
      <FeatureFlagsProvider options={{ enabled: true }}>
        <LogsProvider>
          <TagsProvider>
            <PeopleProvider>
              <Stack />
            </PeopleProvider>
          </TagsProvider>
        </LogsProvider>
      </FeatureFlagsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const BackupPage = () => <Text>Backup page</Text>;

const renderData = async () => {
  // Onboarding done plus analytics on: consent, so feature flags load.
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      deviceId: "this-phone",
      actionsDone: [{ title: "onboarding", date: "2026-10-01T10:00:00.000Z" }],
    })
  );
  const result = await renderRouter(
    {
      _layout: Layout,
      index: DataScreen,
      "settings/data/backup": BackupPage,
    },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  return result;
};

describe("DataScreen", () => {
  beforeEach(async () => {
    mockReloadFlags.mockReset();
    mockReloadFlags.mockResolvedValue({ backup: true });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("hides the Backup row while the backup flag is off", async () => {
    mockReloadFlags.mockResolvedValue({ backup: false });

    const result = await renderData();
    await waitFor(() => expect(mockReloadFlags).toHaveBeenCalled());

    expect(await result.findByText("Export")).toBeTruthy();
    expect(result.queryByTestId("backup")).toBeNull();
  });

  test("shows a plain Backup row above export and import", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const result = await renderData();

    expect(await result.findByText("Backup")).toBeTruthy();
    expect(result.queryByText("iCloud")).toBeNull();
    expect(result.getByText("Export")).toBeTruthy();
    expect(result.getByText("Import")).toBeTruthy();
  });

  test("shows a plain Backup row on Android", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    const result = await renderData();

    expect(await result.findByText("Backup")).toBeTruthy();
    expect(result.queryByText("Google")).toBeNull();
  });

  test("opens the Backup page from the status row", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const result = await renderData();
    await userEvent.press(await result.findByTestId("backup"));

    expect(await result.findByText("Backup page")).toBeTruthy();
  });
});
