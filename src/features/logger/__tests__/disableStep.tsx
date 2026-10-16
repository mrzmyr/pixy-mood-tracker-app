import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, userEvent, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import Alert from "@/lib/Alert";
import Providers from "@/shell/Providers";
import { STORAGE_KEY, useSettings } from "@/state/settings";
import { Logger } from "../Logger";

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

// oxlint-disable-next-line anti-slop/no-module-mocking -- the carousel renders no slides until native layout reports a size, which Jest never does
jest.mock("react-native-reanimated-carousel", () => ({
  Carousel: ({
    data,
    renderItem,
    defaultIndex = 0,
  }: {
    data: unknown[];
    renderItem: (info: { index: number }) => React.ReactNode;
    defaultIndex?: number;
  }) => data[defaultIndex] && renderItem({ index: defaultIndex }),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the discard guard needs a navigator (covered in useDiscardGuard tests); this suite renders the logger without one
jest.mock("@/hooks/useDiscardGuard", () => ({
  __esModule: true,
  useDiscardGuard: () => ({ allowLeave: jest.fn() }),
}));

const EmotionsStepState = () => {
  const { hasStep } = useSettings();
  return (
    <Text testID="emotions-step">{hasStep("emotions") ? "on" : "off"}</Text>
  );
};

const renderLogger = () =>
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
        <Logger
          mode="create"
          initialStep="emotions"
          avaliableSteps={["rating", "emotions", "message"]}
          initialItem={_generateItem({ emotions: [], rating: "good" })}
        />
        <EmotionsStepState />
      </Providers>
    </ThemeProvider>
  );

// Presses the confirm (destructive) or cancel button of the open alert.
const answerAlert = (style: "destructive" | "cancel") => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  buttons.find((button) => button.style === style)?.onPress?.();
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      steps: [...INITIAL_STATE.steps, "emotions"],
      actionsDone: [{ title: "onboarding", date: "2026-10-03T00:00:00.000Z" }],
    })
  );
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Logger > emotions > Disable Emotions link", () => {
  test("user who confirms turns the emotions step off", async () => {
    const screen = await renderLogger();
    await waitFor(() =>
      expect(screen.getByTestId("emotions-step")).toHaveTextContent("on")
    );

    await userEvent.press(await screen.findByText("I don't track emotions"));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    answerAlert("destructive");

    await waitFor(() =>
      expect(screen.getByTestId("emotions-step")).toHaveTextContent("off")
    );
  });

  test("user who cancels keeps the emotions step on", async () => {
    const screen = await renderLogger();
    await userEvent.press(await screen.findByText("I don't track emotions"));
    answerAlert("cancel");

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("emotions-step")).toHaveTextContent("on");
    expect(screen.getByText("I don't track emotions")).toBeTruthy();
  });
});
