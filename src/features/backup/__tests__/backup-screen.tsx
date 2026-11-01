import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { userEvent } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { INITIAL_STATE } from "@/constants/settings";
import { DataScreen } from "@/features/datagate/routes";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsProvider } from "@/state/feature-flags";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
} from "@/state/settings";
import type { BackupProviderSetting } from "@/state/settings";
import { toExportSettings } from "@/state/settings/export-settings";
import { _generateItem } from "@/testing/log-item";
import { createBackupFile } from "../backup-file";
import { BackupProvider } from "../backup-provider";
import { setBackupCloudOverride } from "../providers";
import { BackupScreen } from "../routes";

/** Stands in for iCloud and Google Drive: Jest has no native cloud. */
const cloud = {
  connect: jest.fn<Promise<boolean>, []>(),
  resume: jest.fn<Promise<boolean>, []>(),
  disconnect: jest.fn<Promise<void>, []>(),
  isAvailable: jest.fn<Promise<boolean>, []>(),
  readBackupFile: jest.fn<Promise<string | null>, []>(),
  writeBackupFile: jest.fn<Promise<void>, [string]>(),
  deleteBackupFile: jest.fn<Promise<void>, []>(),
};

// jest.setup.js replaces posthog-react-native with one shared fake client.
const mockReloadFlags = jest.mocked(
  getPostHogTestClient().reloadFeatureFlagsAsync
);

/** Onboarding done plus analytics on: consent, so feature flags load. */
const ONBOARDED = [{ title: "onboarding", date: "2026-10-01T10:00:00.000Z" }];

/** Jest runs as iOS. Google Drive on iOS needs an OAuth client id. */
const setGoogleIosClient = (clientId: string | null) => {
  if (Constants.expoConfig) {
    Constants.expoConfig.extra = {
      ...Constants.expoConfig.extra,
      googleIosClientId: clientId,
    };
  }
};

const Layout = () => (
  <SettingsProvider>
    <AnalyticsProvider>
      <FeatureFlagsProvider options={{ enabled: true }}>
        <LogsProvider>
          <TagsProvider>
            <PeopleProvider>
              <BackupProvider>
                <Stack />
              </BackupProvider>
            </PeopleProvider>
          </TagsProvider>
        </LogsProvider>
      </FeatureFlagsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const seed = async (
  backupProvider: BackupProviderSetting | null,
  itemCount = 1
) => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      deviceId: "this-phone",
      backupProvider,
      actionsDone: ONBOARDED,
    })
  );
  await AsyncStorage.setItem(
    LOGS_KEY,
    JSON.stringify({
      items: Array.from({ length: itemCount }, () =>
        _generateItem({ date: "2026-10-01" })
      ),
    })
  );
};

const cloudFile = ({
  deviceId,
  dates,
  now,
}: {
  deviceId: string;
  dates: string[];
  now?: Date;
}) =>
  JSON.stringify(
    createBackupFile({
      deviceId,
      now,
      version: "1.88.0",
      backup: {
        items: dates.map((date) => _generateItem({ date })),
        tags: [],
        tagCategories: [],
        people: [],
        settings: toExportSettings(INITIAL_STATE),
      },
    })
  );

const renderRoutes = async (initialUrl: string) => {
  const result = await renderRouter(
    {
      _layout: Layout,
      "settings/data/index": DataScreen,
      "settings/data/backup": BackupScreen,
    },
    { initialUrl }
  );
  jest.useRealTimers();
  return result;
};

/** Opens Backup from Settings > Data, like a user, once flags loaded. */
const renderScreen = async () => {
  const result = await renderRoutes("/settings/data");
  await userEvent.press(await result.findByTestId("backup"));
  return result;
};

/** Native switch prop: iOS uses `value`, Android uses `on`. */
const isSwitchOn = (element: { props: { value?: boolean; on?: boolean } }) =>
  element.props.value ?? element.props.on;

describe("BackupScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    cloud.connect.mockResolvedValue(true);
    cloud.resume.mockResolvedValue(true);
    cloud.disconnect.mockResolvedValue();
    cloud.isAvailable.mockResolvedValue(true);
    cloud.readBackupFile.mockResolvedValue(null);
    cloud.writeBackupFile.mockResolvedValue();
    cloud.deleteBackupFile.mockResolvedValue();
    setBackupCloudOverride(cloud);
    setGoogleIosClient(null);
    mockReloadFlags.mockResolvedValue({ "backup-ios-icloud": true });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    setBackupCloudOverride(null);
    setGoogleIosClient(null);
  });

  test("no iOS backup flag: deep link lands on Data without a Backup row", async () => {
    // The Android flag never turns on backup on iOS.
    mockReloadFlags.mockResolvedValue({ "backup-android-google-drive": true });
    await seed("icloud");

    const result = await renderRoutes("/settings/data/backup");

    expect(await result.findByText("Export")).toBeTruthy();
    expect(result.queryByTestId("backup")).toBeNull();
    expect(result.queryByTestId("backup-enabled-icloud")).toBeNull();
  });

  test("iCloud: switch on, Not yet, privacy bullets", async () => {
    await seed("icloud");

    const result = await renderScreen();

    expect(await result.findByText("iCloud Backup")).toBeTruthy();
    expect(isSwitchOn(result.getByTestId("backup-enabled-icloud"))).toBe(true);
    expect(await result.findByText("Not yet")).toBeTruthy();
    expect(result.getByText("Last Sync")).toBeTruthy();
    expect(result.getByText("Good to Know")).toBeTruthy();
    expect(result.getByText(/hidden iCloud folder/u)).toBeTruthy();
    expect(result.queryByText("Google Drive Backup")).toBeNull();
    expect(result.queryByTestId("backup-restore")).toBeNull();
  });

  test("iOS Google Drive flag without an OAuth client: no Google Drive row", async () => {
    mockReloadFlags.mockResolvedValue({
      "backup-ios-icloud": true,
      "backup-ios-google-drive": true,
    });
    await seed(null);

    const result = await renderScreen();

    expect(await result.findByText("iCloud Backup")).toBeTruthy();
    expect(result.queryByText("Google Drive Backup")).toBeNull();
  });

  test("both iOS flags: two switches, both off, notes for each cloud", async () => {
    setGoogleIosClient("ios-client.apps.googleusercontent.com");
    mockReloadFlags.mockResolvedValue({
      "backup-ios-icloud": true,
      "backup-ios-google-drive": true,
    });
    await seed(null);

    const result = await renderScreen();

    expect(
      await result.findByTestId("backup-enabled-googledrive")
    ).toBeTruthy();
    expect(isSwitchOn(result.getByTestId("backup-enabled-icloud"))).toBe(false);
    expect(isSwitchOn(result.getByTestId("backup-enabled-googledrive"))).toBe(
      false
    );
    expect(result.queryByTestId("backup-last-sync")).toBeNull();
    expect(result.getByText(/hidden iCloud folder/u)).toBeTruthy();
    expect(result.getByText(/Google can read it/u)).toBeTruthy();
  });

  test("both iOS flags, Google Drive on: iCloud switch disabled", async () => {
    setGoogleIosClient("ios-client.apps.googleusercontent.com");
    mockReloadFlags.mockResolvedValue({
      "backup-ios-icloud": true,
      "backup-ios-google-drive": true,
    });
    await seed("googledrive");

    const result = await renderScreen();

    expect(await result.findByText("Last Sync")).toBeTruthy();
    expect(isSwitchOn(result.getByTestId("backup-enabled-googledrive"))).toBe(
      true
    );
    expect(result.getByTestId("backup-enabled-icloud").props.disabled).toBe(
      true
    );
    expect(result.queryByText(/hidden iCloud folder/u)).toBeNull();
  });

  test("bigger backup from another phone: relative time and Restore", async () => {
    await seed("icloud");
    cloud.readBackupFile.mockResolvedValue(
      cloudFile({
        deviceId: "old-phone",
        dates: ["2025-01-01", "2025-01-02"],
        now: new Date(Date.now() - 2 * 60 * 60 * 1000),
      })
    );

    const result = await renderScreen();

    expect(await result.findByText("Restore from Backup…")).toBeTruthy();
    expect(result.getByText("2 hours ago")).toBeTruthy();
    expect(result.getByText(/Another phone wrote the backup/u)).toBeTruthy();
  });

  test("reinstall with no entries: Restore says this phone has no entries", async () => {
    await seed("icloud", 0);
    cloud.readBackupFile.mockResolvedValue(
      cloudFile({
        deviceId: "this-phone-before-reinstall",
        dates: ["2025-01-01"],
      })
    );

    const result = await renderScreen();

    expect(await result.findByText("Restore from Backup…")).toBeTruthy();
    expect(
      result.getByText(
        "This phone has no entries yet. Restore the backup to keep backing up."
      )
    ).toBeTruthy();
    expect(result.queryByText(/Another phone/u)).toBeNull();
  });

  test("iCloud Drive off: note instead of Last Sync", async () => {
    await seed("icloud");
    cloud.isAvailable.mockResolvedValue(false);

    const result = await renderScreen();

    expect(
      await result.findByText("Turn on iCloud Drive in Settings to back up.")
    ).toBeTruthy();
    expect(result.queryByText("Last Sync")).toBeNull();
  });

  test("own backup: no Restore, so local changes cannot be overwritten", async () => {
    await seed("icloud");
    cloud.readBackupFile.mockResolvedValue(
      cloudFile({ deviceId: "this-phone", dates: ["2026-10-01"] })
    );

    const result = await renderScreen();

    expect(await result.findByText("Last Sync")).toBeTruthy();
    expect(result.queryByTestId("backup-restore")).toBeNull();
  });

  test("fresh backup never reads as a future time", async () => {
    await seed("icloud");
    cloud.readBackupFile.mockResolvedValue(
      cloudFile({
        deviceId: "this-phone",
        dates: ["2026-10-01"],
        now: new Date(Date.now() + 20_000),
      })
    );

    const result = await renderScreen();

    expect(await result.findByText("a few seconds ago")).toBeTruthy();
  });
});
