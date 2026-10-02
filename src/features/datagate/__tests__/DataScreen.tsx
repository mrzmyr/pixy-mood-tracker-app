import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { userEvent } from "@testing-library/react-native";
import { Platform, Text } from "react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import { TagsProvider } from "@/features/tags";
import { DataScreen } from "../screens/Data";

const Layout = () => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>
        <TagsProvider>
          <Stack />
        </TagsProvider>
      </LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const BackupPage = () => <Text>Backup page</Text>;

const renderData = async () => {
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
  afterEach(() => {
    jest.restoreAllMocks();
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
