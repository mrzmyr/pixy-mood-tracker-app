import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { LicensesScreen } from "../screens/licenses";

const mockReadText = jest.fn<Promise<string>, [string]>();

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-asset resolves bundled files through native code Jest does not run.
jest.mock("expo-asset", () => ({
  __esModule: true,
  Asset: {
    fromModule: () => ({
      uri: "file:///bundle/licenses.txt",
      localUri: "file:///bundle/licenses.txt",
      downloadAsync: () => Promise.resolve(),
    }),
  },
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-file-system reads files through a native module Jest does not run.
jest.mock("expo-file-system", () => ({
  __esModule: true,
  File: jest.fn((uri: string) => ({ text: () => mockReadText(uri) })),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- failures are reported through the Sentry SDK imported directly in the screen.
jest.mock("@sentry/react-native", () => ({
  __esModule: true,
  captureException: jest.fn(),
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

const renderLicenses = () =>
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider
        value={{
          ...DefaultTheme,
          dark: false,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <LicensesScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );

describe("Settings > Licenses", () => {
  beforeEach(() => {
    mockReadText.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("shows a spinner, then the notices from the asset", async () => {
    const pending = Promise.withResolvers<string>();
    mockReadText.mockReturnValue(pending.promise);
    await renderLicenses();

    expect(screen.getByTestId("licenses-loading")).toBeTruthy();

    pending.resolve("Notice A\n-----\nNotice B");

    expect(await screen.findByText("Notice A")).toBeTruthy();
    expect(screen.getByText("Notice B")).toBeTruthy();
    expect(screen.queryByTestId("licenses-loading")).toBeNull();
    expect(mockReadText).toHaveBeenCalledWith("file:///bundle/licenses.txt");
  });

  test("read failure: shows the error, retry loads the notices", async () => {
    mockReadText
      .mockRejectedValueOnce(new Error("ENOENT"))
      .mockResolvedValueOnce("Notice A");
    await renderLicenses();

    expect(await screen.findByTestId("licenses-error")).toBeTruthy();
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "licenses_load_failed",
        why: expect.stringContaining("ENOENT"),
        fix: expect.any(String),
      })
    );

    fireEvent.press(screen.getByTestId("licenses-retry"));

    await waitFor(() => {
      expect(screen.getByText("Notice A")).toBeTruthy();
    });
    expect(screen.queryByTestId("licenses-error")).toBeNull();
  });
});
