import type { Emotion } from "@/types";
import chunkArray from "lodash/chunk";
import { View } from "react-native";
import { EmotionButtonAdvanced } from "./emotion-button-advanced";
import { EmotionContextMenu } from "./emotion-context-menu";
import { MissingEmotionTile } from "./missing-emotion-tile";
import { sortForColumns } from "./sort-for-columns";

type Cell = Emotion | "missing" | "empty";

const keyOf = (cell: Cell) =>
  cell === "missing" || cell === "empty" ? cell : cell.key;

const COLUMNS = 2;

// Plain views split each row evenly. Without them a `RectButton` emotion next
// to the `Pressable` "Missing one?" tile gets a narrower share of the row.
const CELL_STYLE = { flex: 1 };
// Content keeps its own height. With `flex: 1` it collapses in the
// fixed-height carousel.
const CELL_CONTENT_STYLE = { flex: 0 };

/**
 * One page of advanced emotions in two columns, ending with a "Missing
 * one?" tile; an odd count is padded with a blank cell. Every cell gets the
 * same width. Emotions are arranged to read alphabetically when scanned
 * column-by-column (top to bottom in left column, then top to bottom in
 * right column).
 */
export const EmotionPage = ({
  emotions,
  onPress,
  onRequestEmotion,
  selectedEmotions,
}: {
  emotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  onRequestEmotion: () => void;
  selectedEmotions: Emotion[];
}) => {
  const sortedForColumns = sortForColumns(emotions, COLUMNS);
  const isSelected = (emotion: Emotion) =>
    selectedEmotions.some((d) => d.key === emotion.key);
  const cells: Cell[] = [...sortedForColumns, "missing"];
  const chunks = chunkArray(cells, COLUMNS).map((d): Cell[] =>
    d.length === 1 ? [...d, "empty"] : d
  );

  return (
    <View
      style={{
        flexDirection: "column",
        width: "100%",
        paddingHorizontal: 4,
        paddingTop: 12,
        gap: 6,
        paddingBottom: 6,
      }}
    >
      {chunks.map((chunk) => (
        <View
          key={`emotion-page-${keyOf(chunk[0])}`}
          style={{
            flexDirection: "row",
            gap: 6,
          }}
        >
          {chunk.map((cell) => (
            <View key={`advanced-cell-${keyOf(cell)}`} style={CELL_STYLE}>
              {cell === "missing" && (
                <MissingEmotionTile
                  onPress={onRequestEmotion}
                  style={CELL_CONTENT_STYLE}
                />
              )}
              {cell !== "missing" && cell !== "empty" && (
                <EmotionContextMenu
                  emotion={cell}
                  onPress={onPress}
                  selected={isSelected(cell)}
                >
                  <EmotionButtonAdvanced
                    emotion={cell}
                    onPress={onPress}
                    selected={isSelected(cell)}
                    style={CELL_CONTENT_STYLE}
                  />
                </EmotionContextMenu>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};
