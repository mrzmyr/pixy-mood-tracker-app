import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { act, fireEvent } from "@testing-library/react-native";
import { Platform } from "react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import * as backup from "@/lib/backup";
import { initializeDayjs } from "@/lib/translation";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { BackupScreen } from "../screens/Backup";

const Layout = () => (
  <SettingsProvider>
    <AnalyticsProvider>
      <Stack />
    </AnalyticsProvider>
  </SettingsProvider>
);

const renderBackup = async () => {
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
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, loaded: true })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("iOS: iCloud Backup switch on, no last sync, privacy bullets", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const result = await renderBackup();

    expect(await result.findByText("iCloud Backup")).toBeTruthy();
    expect(isSwitchOn(result.getByTestId("backup-enabled"))).toBe(true);
    expect(result.queryByTestId("backup-last-sync")).toBeNull();
    expect(result.getByText(/Advanced Data Protection/u)).toBeTruthy();
    expect(result.getByText(/Pixy has no server/u)).toBeTruthy();
  });

  test("Android: shows the last sync date", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    jest
      .spyOn(backup, "getLastBackupAt")
      .mockReturnValue(new Date(2026, 9, 2, 13, 40).getTime());

    const result = await renderBackup();

    expect(await result.findByText("Google Backup")).toBeTruthy();
    expect(result.getByText("Last sync")).toBeTruthy();
    expect(result.getByText(/Oct 2, 2026/u)).toBeTruthy();
    expect(result.getByText(/Without a screen lock/u)).toBeTruthy();
  });

  test("Android: says Not yet before the first backup", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    jest.spyOn(backup, "getLastBackupAt").mockReturnValue(null);

    const result = await renderBackup();

    expect(await result.findByText("Not yet")).toBeTruthy();
  });

  test("turning the switch off stores it and hides last sync", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    jest.spyOn(backup, "getLastBackupAt").mockReturnValue(null);

    const result = await renderBackup();
    const toggle = await result.findByTestId("backup-enabled");
    await act(() => {
      fireEvent(toggle, "valueChange", false);
    });

    expect(isSwitchOn(result.getByTestId("backup-enabled"))).toBe(false);
    expect(result.queryByTestId("backup-last-sync")).toBeNull();
  });
});
