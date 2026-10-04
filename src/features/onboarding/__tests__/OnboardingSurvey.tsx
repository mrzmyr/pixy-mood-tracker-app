import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, userEvent } from "@testing-library/react-native";
import { DefaultTheme, router, ThemeProvider } from "expo-router";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Text } from "react-native";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { OnboardingSurvey } from "@/features/onboarding";
import { LogsProvider } from "@/features/logs";
import { TagsProvider, useTagsState } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual("react-native");
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: View,
    SafeAreaInsetsContext: jest.requireActual("react").createContext(insets),
    SafeAreaFrameContext: jest.requireActual("react").createContext(frame),
    initialWindowMetrics: { insets, frame },
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

// jest.setup.js replaces posthog-react-native with one shared fake client.
const { capture: mockCapture } = getPostHogTestClient();

// Generating screen stays at least 3.4 s; Pixy hops 0.7 s per answer.
const SLOW = { timeout: 6000 };

const AppState = () => {
  const { settings } = useSettings();
  const { tags } = useTagsState();
  return (
    <>
      <Text testID="steps">{settings.steps.join(",")}</Text>
      <Text testID="tags">{tags.map((tag) => tag.title).join(",")}</Text>
      <Text testID="onboarding-done">
        {String(settings.actionsDone.some((a) => a.title === "onboarding"))}
      </Text>
    </>
  );
};

const renderSurvey = ({ needsConsent }: { needsConsent: boolean }) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: true }}>
          <LogsProvider>
            <TagsProvider>
              <OnboardingSurvey needsConsent={needsConsent} />
              <AppState />
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

const surveyCompleted = () =>
  jest
    .mocked(mockCapture)
    .mock.calls.filter(([event]) => event === "onboarding:survey_completed");

describe("Onboarding survey", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(router, "replace").mockImplementation(jest.fn());
    jest.spyOn(router, "push").mockImplementation(jest.fn());
    await AsyncStorage.clear();
  });

  test("answers set up check-in steps and tags, then open the first entry", async () => {
    const result = await renderSurvey({ needsConsent: false });
    const press = async (testID: string) =>
      userEvent.press(await result.findByTestId(testID, {}, SLOW));

    await press("onboarding-survey-start");
    await press("onboarding-survey-experience-journal");
    await press("onboarding-survey-goals-stress");
    await press("onboarding-survey-continue");
    await press("onboarding-survey-frequency-daily");
    await press("onboarding-survey-reminder-none");
    await press("onboarding-survey-depth-quick");
    await press("onboarding-survey-influences-sleep");
    await press("onboarding-survey-influences-work");
    await press("onboarding-survey-continue");
    await userEvent.press(await result.findByText("Understood", {}, SLOW));

    expect(
      await result.findByText("2 Starter Tags", {}, SLOW)
    ).toBeOnTheScreen();
    await press("onboarding-survey-finish");

    expect(router.replace).toHaveBeenCalledWith("/calendar");
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/logs/create/[dateTime]" })
    );
    // Quick check-ins plus: emotions for hard days, tags for the
    // influences, a note for journal writers.
    expect(result.getByTestId("steps")).toHaveTextContent(
      "rating,tags,emotions,message"
    );
    expect(result.getByTestId("tags")).toHaveTextContent("Sleep 😴,Work 💼");
    expect(result.getByTestId("onboarding-done")).toHaveTextContent("true");
    expect(surveyCompleted()[0][1]).toMatchObject({
      experience: "journal",
      goals: ["stress"],
      depth: "quick",
      influences: ["sleep", "work"],
      skipped_count: 0,
    });
  }, 30_000);

  test("skipping every question keeps the default steps and tags", async () => {
    const result = await renderSurvey({ needsConsent: true });

    await userEvent.press(await result.findByTestId("onboarding-survey-start"));
    const skip = async (left: number): Promise<void> => {
      if (left === 0) {
        return;
      }
      await userEvent.press(
        await result.findByTestId("onboarding-survey-skip", {}, SLOW)
      );
      await skip(left - 1);
    };
    await skip(6);
    // Consent region: declining analytics before anything is sent.
    await userEvent.press(
      await result.findByTestId("analytics-consent-deny", {}, SLOW)
    );
    await userEvent.press(
      await result.findByTestId("onboarding-survey-finish", {}, SLOW)
    );

    expect(result.getByTestId("steps")).toHaveTextContent(
      INITIAL_STATE.steps.join(",")
    );
    expect(result.getByTestId("tags")).toHaveTextContent(
      /^Family 🏡,Friends 🤝,/u
    );
    expect(surveyCompleted()).toHaveLength(0);
  }, 30_000);
});
