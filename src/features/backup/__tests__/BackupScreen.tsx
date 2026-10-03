import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { BackupScreen } from "@/features/settings";
import { TagsProvider } from "@/features/tags";
import { initializeDayjs } from "@/lib/translation";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
} from "@/state/settings";
import * as cloud from "../cloud";
import { createBackupFile } from "../backupFile";
import { BackupProvider } from "../BackupProvider";

// oxlint-disable-next-line anti-slop/no-module-mocking -- cloud.ts is the native boundary (iCloud, Google Drive, Google Sign-In); Jest has none of them
jest.mock("../cloud", () => ({
  getBackupProvider: jest.fn(() => "icloud"),
  connect: jest.fn(() => Promise.resolve(true)),
  resume: jest.fn(() => Promise.resolve(true)),
  disconnect: jest.fn(() => Promise.resolve()),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  readBackupFile: jest.fn(() => Promise.resolve(null)),
  writeBackupFile: jest.fn(() => Promise.resolve()),
  deleteBackupFile: jest.fn(() => Promise.resolve()),
}));

const Layout = () => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>
        <TagsProvider>
          <BackupProvider>
            <Stack />
          </BackupProvider>
        </TagsProvider>
      </LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const seed = async (backupEnabled: boolean) => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...INITIAL_STATE, deviceId: "this-phone", backupEnabled })
  );
  await AsyncStorage.setItem(
    LOGS_KEY,
    JSON.stringify({ items: [_generateItem({ date: "2026-10-01" })] })
  );
};

const renderScreen = async () => {
  const result = await renderRouter(
    { _layout: Layout, index: BackupScreen },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  return result;
};

/** Native switch prop: iOS uses `value`, Android uses `on`. */
const isSwitchOn = (element: { props: { value?: boolean; on?: boolean } }) =>
  element.props.value ?? element.props.on;

describe("BackupScreen", () => {
  beforeAll(() => {
    initializeDayjs();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(cloud.getBackupProvider).mockReturnValue("icloud");
    jest.mocked(cloud.readBackupFile).mockResolvedValue(null);
    jest.mocked(cloud.isAvailable).mockResolvedValue(true);
    await AsyncStorage.clear();
  });

  test("iCloud: switch on, Not yet, privacy bullets", async () => {
    await seed(true);

    const result = await renderScreen();

    expect(await result.findByText("iCloud Backup")).toBeTruthy();
    expect(isSwitchOn(result.getByTestId("backup-enabled"))).toBe(true);
    expect(await result.findByText("Not yet")).toBeTruthy();
    expect(result.getByText("Last Sync")).toBeTruthy();
    expect(result.getByText("Good to Know")).toBeTruthy();
    expect(result.getByText(/hidden iCloud folder/u)).toBeTruthy();
    expect(result.queryByTestId("backup-restore")).toBeNull();
  });

  test("Google Drive: switch off hides last sync", async () => {
    jest.mocked(cloud.getBackupProvider).mockReturnValue("googledrive");
    await seed(false);

    const result = await renderScreen();

    expect(await result.findByText("Google Drive Backup")).toBeTruthy();
    expect(isSwitchOn(result.getByTestId("backup-enabled"))).toBe(false);
    expect(result.queryByTestId("backup-last-sync")).toBeNull();
    expect(result.getByText(/Google can read it/u)).toBeTruthy();
  });

  test("bigger backup from another phone: relative time and Restore", async () => {
    await seed(true);
    jest.mocked(cloud.readBackupFile).mockResolvedValue(
      JSON.stringify(
        createBackupFile({
          deviceId: "old-phone",
          now: new Date(Date.now() - 2 * 60 * 60 * 1000),
          data: {
            version: "1.88.0",
            items: [
              _generateItem({ date: "2025-01-01" }),
              _generateItem({ date: "2025-01-02" }),
            ],
            tags: [],
            settings: { ...INITIAL_STATE },
          },
        })
      )
    );

    const result = await renderScreen();

    expect(await result.findByText("Restore from Backup…")).toBeTruthy();
    expect(result.getByText("2 hours ago")).toBeTruthy();
  });

  test("iCloud Drive off: note instead of Last Sync", async () => {
    await seed(true);
    jest.mocked(cloud.isAvailable).mockResolvedValue(false);

    const result = await renderScreen();

    expect(
      await result.findByText("Turn on iCloud Drive in Settings to back up.")
    ).toBeTruthy();
    expect(result.queryByText("Last Sync")).toBeNull();
  });

  test("own backup: no Restore, so local changes cannot be overwritten", async () => {
    await seed(true);
    jest.mocked(cloud.readBackupFile).mockResolvedValue(
      JSON.stringify(
        createBackupFile({
          deviceId: "this-phone",
          data: {
            version: "1.88.0",
            items: [_generateItem({ date: "2026-10-01" })],
            tags: [],
            settings: { ...INITIAL_STATE },
          },
        })
      )
    );

    const result = await renderScreen();

    expect(await result.findByText("Last Sync")).toBeTruthy();
    expect(result.queryByTestId("backup-restore")).toBeNull();
  });
});
