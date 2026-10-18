import * as Sentry from "@sentry/react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { ObserveErrorBoundary } from "expo-observe";
import { Text } from "react-native";
import { createStructuredError } from "@/lib/errors";
import { AppErrorScreen } from "@/shell/app-error-screen";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the fallback reports through the Sentry SDK; the test asserts on captureException
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

let isBroken = true;

const Statistics = () => {
  if (isBroken) {
    throw createStructuredError({
      status: "statistics_render_failed",
      message: "Cannot read property 'entries' of undefined",
      why: "Test screen throws on purpose",
      fix: "Set isBroken to false",
    });
  }
  return <Text>Statistics</Text>;
};

const renderApp = () =>
  render(
    <ObserveErrorBoundary fallback={(props) => <AppErrorScreen {...props} />}>
      <Statistics />
    </ObserveErrorBoundary>
  );

describe("AppErrorScreen", () => {
  beforeEach(() => {
    isBroken = true;
    jest.mocked(Sentry.captureException).mockClear();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("replaces a crashed screen with recovery actions", async () => {
    await renderApp();

    expect(await screen.findByTestId("app-error")).toBeTruthy();
    expect(screen.getByTestId("app-error-retry")).toBeTruthy();
    expect(screen.getByTestId("app-error-export")).toBeTruthy();
    expect(screen.getByText("Error code: render_failed")).toBeTruthy();
  });

  it("reports the render error to Sentry once, with the thrower's stack", async () => {
    await renderApp();
    await screen.findByTestId("app-error");

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "render_failed",
        why: "Error: Cannot read property 'entries' of undefined",
        stack: expect.stringContaining("Statistics"),
      })
    );
  });

  it("remounts the app on Try again", async () => {
    const user = userEvent.setup();
    await renderApp();
    await screen.findByTestId("app-error");

    isBroken = false;
    await user.press(screen.getByTestId("app-error-retry"));

    expect(await screen.findByText("Statistics")).toBeTruthy();
    expect(screen.queryByTestId("app-error")).toBeNull();
  });
});
