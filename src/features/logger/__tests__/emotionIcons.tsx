import { render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { EmotionItem } from "@/features/calendar";
import { SettingsProvider } from "@/state/settings";
import type { Emotion } from "@/types";
import { EMOTIONS } from "../config";

let mockIsIconsEnabled = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the emotion-icons flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: (flag: string) =>
    flag === "emotion-icons" && mockIsIconsEnabled,
}));

const OFFERED = EMOTIONS.filter((e) => e.disabled !== true);
const CALM = OFFERED.filter((e) => e.key === "calm");
const HIDDEN = EMOTIONS.filter((e) => e.disabled === true).slice(0, 1);

const renderEmotions = (emotions: Emotion[]) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        {emotions.map((emotion) => (
          <EmotionItem key={emotion.key} emotion={emotion} />
        ))}
      </SettingsProvider>
    </ThemeProvider>
  );

describe("Emotion icons", () => {
  afterEach(() => {
    mockIsIconsEnabled = true;
  });

  test("flag on: entry shows the emotion icon", async () => {
    await renderEmotions(CALM);

    expect(await screen.findByTestId("emotion-icon-calm")).toBeTruthy();
  });

  test("flag off: entry keeps the category dot", async () => {
    mockIsIconsEnabled = false;
    await renderEmotions(CALM);
    await screen.findByText("Calm");

    expect(screen.queryByTestId("emotion-icon-calm")).toBeNull();
  });

  test("flag on: emotion without an icon keeps the category dot", async () => {
    expect(HIDDEN).toHaveLength(1);
    await renderEmotions(HIDDEN);
    await screen.findByText(HIDDEN[0]?.label ?? "");

    expect(screen.queryByTestId(`emotion-icon-${HIDDEN[0]?.key}`)).toBeNull();
  });

  test("every emotion the logger offers has an icon", async () => {
    await renderEmotions(OFFERED);
    await screen.findByTestId(`emotion-icon-${OFFERED[0]?.key}`);

    const withoutIcon = OFFERED.filter(
      (e) => screen.queryByTestId(`emotion-icon-${e.key}`) === null
    ).map((e) => e.key);
    expect(withoutIcon).toEqual([]);
  });
});
