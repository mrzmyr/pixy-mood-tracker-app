import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, Text, View } from "react-native";

import useColors from "@/hooks/use-colors";

import { EMOTION_ICONS } from "../../emotion-icons";
import { EmotionIcon } from "./emotion-icon";

const EMOTION_KEYS = Object.keys(EMOTION_ICONS);

const meta = {
  title: "Emotions/EmotionIcon",
  component: EmotionIcon,
  args: { emotionKey: "calm", size: 48 },
  argTypes: {
    emotionKey: { control: "select", options: EMOTION_KEYS },
    stroke: { control: "color" },
    tint: { control: "color" },
    size: { control: { type: "range", min: 12, max: 96, step: 4 } },
  },
} satisfies Meta<typeof EmotionIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One icon. Neutral theme colors until `stroke` or `tint` is set. */
export const Playground: Story = {};

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: { width: 96, alignItems: "center", gap: 4, paddingVertical: 8 },
  label: { fontSize: 11 },
});

/** Every emotion icon, also emotions the logger no longer offers. */
const Gallery = ({
  stroke,
  tint,
  size,
}: {
  stroke?: string;
  tint?: string;
  size?: number;
}) => {
  const colors = useColors();
  return (
    <View style={styles.grid}>
      {EMOTION_KEYS.map((key) => (
        <View key={key} style={styles.cell}>
          <EmotionIcon
            emotionKey={key}
            stroke={stroke}
            tint={tint}
            size={size}
          />
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {key}
          </Text>
        </View>
      ))}
    </View>
  );
};

/** All icons in neutral theme colors. */
export const AllNeutral: Story = {
  args: { size: 32 },
  argTypes: { emotionKey: { table: { disable: true } } },
  render: ({ stroke, tint, size }) => (
    <Gallery stroke={stroke} tint={tint} size={size} />
  ),
};

/** All icons tinted through `stroke` and `tint`. */
export const AllTinted: Story = {
  args: { size: 32, stroke: "#166534", tint: "#16a34a" },
  argTypes: { emotionKey: { table: { disable: true } } },
  render: ({ stroke, tint, size }) => (
    <Gallery stroke={stroke} tint={tint} size={size} />
  ),
};
