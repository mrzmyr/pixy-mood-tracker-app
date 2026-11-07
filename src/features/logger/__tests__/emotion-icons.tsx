import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import { EmotionItem } from "@/features/calendar";
import { SettingsProvider } from "@/state/settings";
import type { Emotion } from "@/types";
import { EMOTIONS } from "../config";
import { EMOTION_ICONS } from "../emotion-icons";
import { EMOTION_TINTS } from "../emotion-tints";
import { EmotionIcon } from "../slides/slide-emotions/emotion-icon";

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

const renderThemed = (children: ReactNode) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>{children}</SettingsProvider>
    </ThemeProvider>
  );

const renderEmotions = (emotions: Pick<Emotion, "key" | "category">[]) =>
  renderThemed(
    emotions.map((emotion) => (
      <EmotionItem key={emotion.key} emotion={emotion} />
    ))
  );

describe("Emotion icons", () => {
  test("entry shows the emotion icon", async () => {
    await renderEmotions(CALM);

    expect(await screen.findByTestId("emotion-icon-calm")).toBeTruthy();
  });

  test("unknown emotion key renders without an icon", async () => {
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
    await renderThemed(
      <View>
        {EMOTIONS.map(({ key }) => (
          <View key={key} testID={`shapes-${key}`}>
            <EmotionIcon emotionKey={key} />
          </View>
        ))}
      </View>
    );

    const incomplete = EMOTIONS.flatMap(({ key }) => {
      const icon = EMOTION_ICONS[key];
      const container = screen.queryByTestId(`shapes-${key}`);
      if (!icon || !container) {
        return [`${key}: no icon`];
      }
      const expected =
        icon.length + (EMOTION_TINTS[key]?.underlay?.length ?? 0);
      const drawn = container.queryAll(isSvgDrawing).length;
      return drawn > 0 && drawn === expected
        ? []
        : [`${key}: ${drawn} of ${expected} shapes`];
    });
    expect(incomplete).toEqual([]);
  });

  test("every tint fills shapes its icon has", () => {
    // Swapping an icon can leave tint indexes that point past its shapes,
    // and the tint then silently disappears.
    const broken = Object.entries(EMOTION_TINTS).flatMap(([key, tint]) => {
      const partCount = EMOTION_ICONS[key]?.length ?? 0;
      const missing = (tint?.fill ?? []).filter((i) => i >= partCount);
      return missing.length > 0 ? [`${key}: ${missing.join(", ")}`] : [];
    });
    expect(broken).toEqual([]);
  });
});
