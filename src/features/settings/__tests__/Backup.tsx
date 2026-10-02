import { renderRouter } from "expo-router/testing-library";
import { Platform } from "react-native";
import { BackupScreen } from "../screens/Backup";

const renderBackup = async () => {
  const result = await renderRouter(
    { index: BackupScreen },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  return result;
};

describe("BackupScreen", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("explains the iPhone backup and names Apple's access", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const result = await renderBackup();

    expect(await result.findByText("iCloud Backup")).toBeTruthy();
    expect(result.getByText("Included")).toBeTruthy();
    expect(result.getByText(/Advanced Data Protection/u)).toBeTruthy();
    expect(result.getByText(/Pixy has no server/u)).toBeTruthy();
    expect(result.getByText(/Manage Storage > Backups/u)).toBeTruthy();
  });

  test("explains the Android backup and the screen lock requirement", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    const result = await renderBackup();

    expect(await result.findByText("Google Backup")).toBeTruthy();
    expect(result.getByText("Included")).toBeTruthy();
    expect(result.getByText(/Without a screen lock/u)).toBeTruthy();
    expect(result.getByText(/Pixy has no server/u)).toBeTruthy();
  });
});
