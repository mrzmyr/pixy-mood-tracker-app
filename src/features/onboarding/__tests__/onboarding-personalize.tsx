import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, userEvent, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { Onboarding } from "@/features/onboarding/routes";
import { LogsProvider } from "@/features/logs";
import { TagsProvider, useTagsState } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";

/** Prints stored answers, so the test reads what onboarding applied. */
const Stored = () => {
  const { settings } = useSettings();
  const { tags, categories } = useTagsState();
  return (
    <Text testID="stored">
      {JSON.stringify({
        name: settings.profileName,
        personalization: settings.personalization,
        steps: settings.steps,
        kinds: categories.map((category) => category.kind ?? null),
        catalogKeys: tags.map((tag) => tag.catalogKey ?? null),
      })}
    </Text>
  );
};

const readStored = (text: string) =>
  // SAFETY: `Stored` above writes exactly this shape.
  JSON.parse(text) as {
    name: string;
    personalization: { goal: string | null; struggles: string[] };
    steps: string[];
    kinds: (string | null)[];
    catalogKeys: (string | null)[];
  };

const renderOnboarding = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
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
                <Onboarding needsConsent={false} />
                <Stored />
              </TagsProvider>
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );

describe("Personalized onboarding", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("answers set the name, the steps, and typed tag categories", async () => {
    const screen = await renderOnboarding();
    const user = userEvent.setup();

    await user.press(await screen.findByTestId("onboarding-start"));
    await user.type(await screen.findByTestId("onboarding-name"), "Sam");
    await user.press(screen.getByTestId("onboarding-name-next"));

    await user.press(await screen.findByTestId("onboarding-goal-what_helps"));
    await user.press(screen.getByTestId("onboarding-goal-next"));

    await user.press(await screen.findByTestId("onboarding-struggle-focus"));
    await user.press(screen.getByTestId("onboarding-struggle-medication"));
    await user.press(screen.getByTestId("onboarding-struggles-next"));

    // Notes off, everything else as it was.
    await user.press(await screen.findByTestId("onboarding-capture-message"));
    await user.press(screen.getByTestId("onboarding-capture-next"));

    // The summary explains the suggestion; one tag is left out.
    expect(
      await screen.findAllByText("Because you chose Focus or ADHD")
    ).toHaveLength(2);
    expect(
      await screen.findByText("Because you chose Medication")
    ).toBeTruthy();
    await user.press(screen.getByTestId("onboarding-tag-missed_meds"));
    await user.press(screen.getByTestId("onboarding-summary-next"));

    await user.press(await screen.findByText("Maybe later"));
    await user.press(await screen.findByText("Understood"));

    await waitFor(() => {
      const stored = readStored(
        String(screen.getByTestId("stored").props.children)
      );
      expect(stored.name).toBe("Sam");
      expect(stored.personalization).toEqual({
        goal: "what_helps",
        struggles: ["focus", "medication"],
      });
      expect(stored.steps).not.toContain("message");
      expect(stored.kinds).toEqual(
        expect.arrayContaining(["focus", "medication"])
      );
      expect(stored.catalogKeys).toContain("took_meds");
      expect(stored.catalogKeys).not.toContain("missed_meds");
    });
  });

  test("skipping keeps the default tags and stores no answers", async () => {
    const screen = await renderOnboarding();
    const user = userEvent.setup();

    await user.press(await screen.findByTestId("onboarding-start"));
    await user.press(await screen.findByTestId("onboarding-skip"));

    await waitFor(() => {
      const stored = readStored(
        String(screen.getByTestId("stored").props.children)
      );
      expect(stored.personalization).toEqual({ goal: null, struggles: [] });
      expect(stored.kinds).toEqual([null]);
      expect(stored.catalogKeys.every((key) => key === null)).toBe(true);
    });
  });
});
