import { render, screen } from "@testing-library/react-native";
import { View } from "react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { EmotionItem } from "@/features/calendar";
import { SettingsProvider } from "@/state/settings";
import type { Emotion } from "@/types";
import { EMOTIONS } from "../config";
import { EMOTION_ICONS } from "../emotionIcons";
import { EmotionIcon } from "../slides/SlideEmotions/EmotionIcon";

let mockIsIconsEnabled = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the emotion-icons flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: (flag: string) =>
    flag === "emotion-icons" && mockIsIconsEnabled,
}));

const CALM = EMOTIONS.filter((e) => e.key === "calm");
// Keys are open strings: entries from newer app versions can hold any key.
const UNKNOWN: Pick<Emotion, "key" | "category">[] = [
  { key: "not_an_emotion", category: "good" },
];

/** SVG elements that draw something: every RNSVG host except containers. */
const isSvgDrawing = (node: { type: string }) =>
  node.type.startsWith("RNSVG") &&
  node.type !== "RNSVGSvgView" &&
  node.type !== "RNSVGGroup";

const renderEmotions = (emotions: Pick<Emotion, "key" | "category">[]) =>
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

  test("flag on: unknown emotion key keeps the category dot", async () => {
    await renderEmotions(UNKNOWN);

    expect(screen.queryByTestId("emotion-icon-not_an_emotion")).toBeNull();
  });

  test("every emotion has an icon, also emotions the logger no longer offers", async () => {
    // Old entries keep disabled emotions, and calendar cards show them.
    await renderEmotions(EMOTIONS);
    await screen.findByTestId(`emotion-icon-${EMOTIONS[0]?.key}`);

    const withoutIcon = EMOTIONS.filter(
      (e) => screen.queryByTestId(`emotion-icon-${e.key}`) === null
    ).map((e) => e.key);
    expect(withoutIcon).toEqual([]);
  });

  test("every emotion icon draws all of its shapes", async () => {
    // A shape type EmotionIcon cannot draw is skipped silently, so an icon
    // could render empty or half drawn.
    await render(
      <View>
        {EMOTIONS.map(({ key }) => {
          const icon = EMOTION_ICONS[key];
          return icon ? (
            <View key={key} testID={`shapes-${key}`}>
              <EmotionIcon icon={icon} stroke="#000" tint="#000" />
            </View>
          ) : null;
        })}
      </View>
    );

    const incomplete = EMOTIONS.flatMap(({ key }) => {
      const icon = EMOTION_ICONS[key];
      const container = screen.queryByTestId(`shapes-${key}`);
      if (!icon || !container) {
        return [`${key}: no icon`];
      }
      const drawn = container.queryAll(isSvgDrawing).length;
      return drawn > 0 && drawn === icon.length
        ? []
        : [`${key}: ${drawn} of ${icon.length} shapes`];
    });
    expect(incomplete).toEqual([]);
  });
});
