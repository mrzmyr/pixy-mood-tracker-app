import type { Emotion } from "@/types";
import chunk from "lodash/chunk";
import orderBy from "lodash/orderBy";
import { View } from "react-native";

import { EmotionButtonBasic } from "./EmotionButtonBasic";
import { MissingEmotionTile } from "./MissingEmotionTile";

// Shared by grid cells and the spacer after a lone last cell, so every
// cell keeps the same width.
const CELL_STYLE = { marginRight: 8, flex: 1 };

/**
 * Two-column emotion grid, good first, then neutral, then bad.
 *
 * Expects categories already reduced to `good`, `neutral`, and `bad`;
 * `very_good` and `very_bad` have no sort rank. A "Missing one?" tile ends
 * the grid.
 */
export const EmotionBasicSelection = ({
  emotions,
  selectedEmotions,
  onPress,
  onRequestEmotion,
}: {
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  onRequestEmotion: () => void;
}) => {
  // `null` marks the "Missing one?" tile after the last emotion.
  const rows = chunk<Emotion | null>(
    [
      ...orderBy(
        emotions,
        (e) =>
          ({
            good: 1,
            neutral: 0,
            bad: -1,
          })[e.category],
        ["desc"]
      ),
      null,
    ],
    2
  );

  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 120,
      }}
    >
      {rows.map((row) => (
        <View
          key={`basic-emotion-row-${row[0]?.key ?? "missing"}`}
          style={{
            flexDirection: "row",
            marginBottom: 8,
          }}
        >
          {row.map((emotion) => (
            <View
              key={`basic-emotion-container-${emotion?.key ?? "missing"}`}
              style={CELL_STYLE}
            >
              {emotion === null ? (
                <MissingEmotionTile onPress={onRequestEmotion} />
              ) : (
                <EmotionButtonBasic
                  emotion={emotion}
                  onPress={onPress}
                  selected={selectedEmotions
                    .map((d) => d.key)
                    .includes(emotion.key)}
                />
              )}
            </View>
          ))}
          {row.length === 1 && <View style={CELL_STYLE} />}
        </View>
      ))}
    </View>
  );
};
