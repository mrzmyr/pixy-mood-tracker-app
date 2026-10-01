import { renderRouter } from "expo-router/testing-library";
import { userEvent } from "@testing-library/react-native";
import { Platform, Text } from "react-native";
import { BackupScreen } from "../screens/Backup";

const DataScreen = () => <Text>Data screen</Text>;

const renderBackup = async () => {
  const result = await renderRouter(
    { index: BackupScreen, "settings/data": DataScreen },
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

    expect(
      await result.findByText("Your entries are part of your iPhone backup")
    ).toBeTruthy();
    expect(result.getByText(/Advanced Data Protection/u)).toBeTruthy();
    expect(result.getByText(/Pixy has no server/u)).toBeTruthy();
  });

  test("explains the Android backup and the screen lock requirement", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    const result = await renderBackup();

    expect(
      await result.findByText("Your entries are part of your Android backup")
    ).toBeTruthy();
    expect(result.getByText(/Without a screen lock/u)).toBeTruthy();
    expect(result.getByText(/Pixy has no server/u)).toBeTruthy();
  });

  test("opens the Data screen for a file export", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const result = await renderBackup();
    await userEvent.press(await result.findByTestId("backup-export"));

    expect(await result.findByText("Data screen")).toBeTruthy();
  });
});
