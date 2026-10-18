import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { ToastHost } from "@/components/Toast";
import { getToastDuration, hideToast, showToast } from "@/lib/toast";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const renderHost = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <ToastHost />
    </ThemeProvider>
  );

afterEach(() => {
  // Module-level toast state would leak into the next test.
  hideToast();
});

describe("Toast action", () => {
  test("user runs the action and the toast goes away", async () => {
    const onPress = jest.fn();
    await renderHost();

    await act(() =>
      showToast({ title: "Entry deleted", action: { label: "Undo", onPress } })
    );
    await userEvent.press(await screen.findByTestId("toast-action"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  test("toast without action shows no button", async () => {
    await renderHost();

    await act(() => showToast({ title: "Saved" }));

    expect(await screen.findByTestId("toast")).toBeOnTheScreen();
    expect(screen.queryByTestId("toast-action")).toBeNull();
  });

  test("toast hides itself after the requested duration", async () => {
    await renderHost();

    await act(() => showToast({ title: "Saved", durationMs: 50 }));
    expect(screen.getByTestId("toast")).toBeOnTheScreen();

    await waitFor(() => expect(screen.queryByTestId("toast")).toBeNull());
  });
});

describe("getToastDuration", () => {
  test("Android snackbar stays longer than iOS toast, longest with an action", () => {
    const ios = getToastDuration({}, "ios");
    const android = getToastDuration({}, "android");
    const withAction = getToastDuration(
      { action: { label: "Undo", onPress: jest.fn() } },
      "android"
    );

    expect(android).toBeGreaterThan(ios);
    expect(withAction).toBeGreaterThan(android);
    expect(withAction).toBeLessThanOrEqual(10_000);
  });

  test("explicit duration wins", () => {
    expect(getToastDuration({ durationMs: 1234 }, "android")).toBe(1234);
  });
});
