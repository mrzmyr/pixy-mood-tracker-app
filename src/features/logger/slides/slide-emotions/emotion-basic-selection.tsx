import { getLocale } from "@/lib/translation";
import type { Emotion } from "@/types";
import chunk from "lodash/chunk";
import { View } from "react-native";

import { EmotionButtonBasic } from "./emotion-button-basic";
import { EmotionContextMenu } from "./emotion-context-menu";
import { MissingEmotionTile } from "./missing-emotion-tile";
import { sortForColumns } from "./sort-for-columns";

// Shared by grid cells and the spacer after a lone last cell, so every
// cell keeps the same width.
const CELL_STYLE = { flex: 1 };
const CELL_GAP = 8;
const COLUMNS = 2;

/**
 * Two-column emotion grid, good first, then neutral, then bad, sorted
 * alphabetically within each category. Emotions are arranged to read
 * alphabetically when scanned column-by-column (top to bottom in left
 * column, then top to bottom in right column).
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
  const locale = getLocale();
  const isSelected = (emotion: Emotion) =>
    selectedEmotions.some((d) => d.key === emotion.key);

  // Sort by category (good first, then neutral, then bad),
  // then alphabetically within each category with locale-aware comparison
  const sortedByCategory = [...emotions].sort((a, b) => {
    // First compare by category
    const categoryRank = {
      good: 1,
      neutral: 0,
      bad: -1,
    };
    const categoryA = categoryRank[a.category] ?? 0;
    const categoryB = categoryRank[b.category] ?? 0;

    if (categoryA !== categoryB) {
      return categoryB - categoryA;
    }

    // Then compare alphabetically with locale awareness
    return a.label.localeCompare(b.label, locale);
  });

  // Rearrange for column-by-column reading
  const sortedForColumns = sortForColumns(sortedByCategory, COLUMNS);

  // `null` marks the "Missing one?" tile after the last emotion.
  const rows = chunk<Emotion | null>([...sortedForColumns, null], COLUMNS);

  return (
    <View
      style={{
        gap: CELL_GAP,
        // Right and bottom padding include one extra cell gap.
        paddingTop: 12,
        paddingBottom: 12 + CELL_GAP,
        paddingLeft: 20,
        paddingRight: 20 + CELL_GAP,
        marginBottom: 120,
      }}
    >
      {rows.map((row) => (
        <View
          key={`basic-emotion-row-${row[0]?.key ?? "missing"}`}
          style={{
            flexDirection: "row",
            gap: CELL_GAP,
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
                <EmotionContextMenu
                  emotion={emotion}
                  onPress={onPress}
                  selected={isSelected(emotion)}
                >
                  <EmotionButtonBasic
                    emotion={emotion}
                    onPress={onPress}
                    selected={isSelected(emotion)}
                  />
                </EmotionContextMenu>
              )}
            </View>
          ))}
          {row.length === 1 && <View style={CELL_STYLE} />}
        </View>
      ))}
    </View>
  );
};
