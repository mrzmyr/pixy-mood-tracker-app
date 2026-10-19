import type { Emotion } from "@/types";
import chunkArray from "lodash/chunk";
import { View } from "react-native";
import {
  EmotionButtonAdvanced,
  EmotionButtonEmpty,
} from "./emotion-button-advanced";
import { MissingEmotionTile } from "./missing-emotion-tile";
import { sortForColumns } from "./sort-for-columns";

type Cell = Emotion | "missing" | "empty";

const keyOf = (cell: Cell) =>
  cell === "missing" || cell === "empty" ? cell : cell.key;

const COLUMNS = 2;

/**
 * One page of advanced emotions in two columns, ending with a "Missing
 * one?" tile; an odd count is padded with a blank cell. Emotions are
 * arranged to read alphabetically when scanned column-by-column (top to
 * bottom in left column, then top to bottom in right column).
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
          {chunk.map((cell) => {
            if (cell === "empty") {
              return <EmotionButtonEmpty key="advanced-empty" />;
            }
            if (cell === "missing") {
              return (
                <MissingEmotionTile
                  key="advanced-missing"
                  onPress={onRequestEmotion}
                />
              );
            }
            return (
              <EmotionButtonAdvanced
                key={`advanced-${cell.key}`}
                emotion={cell}
                onPress={onPress}
                selected={selectedEmotions.map((d) => d.key).includes(cell.key)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};
