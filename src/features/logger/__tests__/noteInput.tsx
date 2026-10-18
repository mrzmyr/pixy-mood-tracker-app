import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import {
  fireEvent,
  render,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Profiler } from "react";
import { _generateItem } from "@/testing/logItem";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import Alert from "@/lib/Alert";
import Providers from "@/shell/Providers";
import { STORAGE_KEY } from "@/state/settings";
import type { LogItem } from "@/features/logs";
import { Logger } from "../Logger";
import type { LoggerMode } from "../Logger";
import type { SavedEntry } from "../hooks/useLoggerActions";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-superwall is a native module imported transitively by Providers
jest.mock(
  "expo-superwall",
  () => ({
    SuperwallExpoModule: { consume: jest.fn() },
    SuperwallProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    usePlacement: () => ({
      registerPlacement: jest.fn(),
      state: { status: "idle" },
    }),
    useSuperwall: <T,>(
      selector: (state: {
        isConfigured: boolean;
        setEventTrackingBehavior: jest.Mock;
      }) => T
    ) =>
      selector({
        isConfigured: false,
        setEventTrackingBehavior: jest.fn(),
      }),
    useSuperwallEvents: jest.fn(),
  }),
  { virtual: true }
);

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the carousel renders no slides until native layout reports a size, which Jest never does; this mock renders every reached slide, like the native carousel
jest.mock("react-native-reanimated-carousel", () => ({
  Carousel: ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (info: { index: number }) => React.ReactNode;
  }) => data.map((_, index) => renderItem({ index })),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the discard guard needs a navigator (covered in useDiscardGuard tests); this suite renders the logger without one
jest.mock("@/hooks/useDiscardGuard", () => ({
  __esModule: true,
  useDiscardGuard: () => ({ allowLeave: jest.fn() }),
}));

const NOTE = "Long walk by the river";

const renderLogger = ({
  mode = "create",
  initialItem = _generateItem({ message: "", rating: "good" }),
  onCreated,
  onCommit,
}: {
  mode?: LoggerMode;
  initialItem?: LogItem;
  onCreated?: (saved: SavedEntry) => void;
  onCommit?: () => void;
} = {}) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Providers
        supportClient={{ enabled: false, openSupport: () => Promise.resolve() }}
      >
        <Profiler id="logger" onRender={() => onCommit?.()}>
          <Logger
            mode={mode}
            initialStep="message"
            avaliableSteps={["rating", "message"]}
            initialItem={initialItem}
            onCreated={onCreated}
          />
        </Profiler>
      </Providers>
    </ThemeProvider>
  );

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      steps: [...INITIAL_STATE.steps, "message"],
      actionsDone: [{ title: "onboarding", date: "2026-10-03T00:00:00.000Z" }],
    })
  );
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Logger > note", () => {
  test("save stores the full note typed without leaving the input", async () => {
    const onCreated = jest.fn();
    const screen = await renderLogger({ onCreated });

    await userEvent.type(await screen.findByTestId("log-message"), NOTE, {
      skipBlur: true,
    });
    // `fireEvent` skips the press-in animation, which the reanimated Jest
    // mock cannot run.
    await fireEvent.press(screen.getByTestId("logger-save"));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(onCreated.mock.lastCall?.[0].item.message).toBe(NOTE);
  });

  test("close after typing asks to discard the changes", async () => {
    const screen = await renderLogger();

    await userEvent.type(await screen.findByTestId("log-message"), "a", {
      skipBlur: true,
    });
    await userEvent.press(screen.getByTestId("logger-close"));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    expect(jest.mocked(Alert.alert).mock.lastCall?.[1]).toBe(
      "Your changes will be lost."
    );
  });

  test("edit shows the stored note", async () => {
    const screen = await renderLogger({
      mode: "edit",
      initialItem: _generateItem({ message: "Stored note", rating: "good" }),
    });

    expect(await screen.findByTestId("log-message")).toHaveDisplayValue(
      "Stored note"
    );
  });

  test("typing does not re-render the logger for every key", async () => {
    let commits = 0;
    const screen = await renderLogger({
      onCommit: () => {
        commits += 1;
      },
    });
    const input = await screen.findByTestId("log-message");
    // Let mount effects (settings load, focus) settle first.
    await waitFor(() => expect(input).toBeTruthy());
    commits = 0;

    await userEvent.type(input, "twenty keys to type.", { skipBlur: true });

    expect(commits).toBeLessThanOrEqual(2);
  });
});
