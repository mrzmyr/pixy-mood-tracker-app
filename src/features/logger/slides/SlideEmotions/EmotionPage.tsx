import type { Emotion } from "@/types";
import chunkArray from "lodash/chunk";
import { View } from "react-native";
import {
  EmotionButtonAdvanced,
  EmotionButtonEmpty,
} from "./EmotionButtonAdvanced";
import { MissingEmotionTile } from "./MissingEmotionTile";

type Cell = Emotion | "missing" | "empty";

const keyOf = (cell: Cell) =>
  cell === "missing" || cell === "empty" ? cell : cell.key;

/**
 * One page of advanced emotions in two columns, ending with a "Missing
 * one?" tile; an odd count is padded with a blank cell.
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
  const cells: Cell[] = [...emotions, "missing"];
  const chunks = chunkArray(cells, 2).map((d): Cell[] =>
    d.length === 1 ? [...d, "empty"] : d
  );

  return (
    <View
      style={{
        flexDirection: "column",
        width: "100%",
        paddingHorizontal: 4,
        paddingTop: 12,
      }}
    >
      {chunks.map((chunk) => (
        <View
          key={`emotion-page-${keyOf(chunk[0])}`}
          style={{
            flexDirection: "row",
            marginBottom: 2,
          }}
        >
          {chunk.map((cell, index) => {
            if (cell === "empty") {
              return <EmotionButtonEmpty key="advanced-empty" />;
            }
            const marginRight = index === 0 ? 6 : 0;
            if (cell === "missing") {
              return (
                <MissingEmotionTile
                  key="advanced-missing"
                  onPress={onRequestEmotion}
                  style={{ marginRight, marginBottom: 4 }}
                />
              );
            }
            return (
              <EmotionButtonAdvanced
                key={`advanced-${cell.key}`}
                emotion={cell}
                onPress={onPress}
                selected={selectedEmotions.map((d) => d.key).includes(cell.key)}
                style={{ marginRight }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};
