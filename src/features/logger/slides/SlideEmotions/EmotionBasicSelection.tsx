import type { Emotion } from "@/types";
import chunk from "lodash/chunk";
import orderBy from "lodash/orderBy";
import { View } from "react-native";
import type { ViewStyle } from "react-native";

import { EmotionButtonBasic } from "./EmotionButtonBasic";

const DEFAULT_STYLE = {};

/**
 * Two-column emotion grid, good first, then neutral, then bad.
 *
 * Expects categories already reduced to `good`, `neutral`, and `bad`;
 * `very_good` and `very_bad` have no sort rank.
 */
export const EmotionBasicSelection = ({
  emotions,
  selectedEmotions,
  onPress,
  style = DEFAULT_STYLE,
}: {
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  style?: ViewStyle;
}) => {
  const rows = chunk(
    orderBy(
      emotions,
      (e) =>
        ({
          good: 1,
          neutral: 0,
          bad: -1,
        })[e.category],
      ["desc"]
    ),
    2
  );

  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 120,
        ...style,
      }}
    >
      {rows.map((row) => (
        <View
          key={`basic-emotion-row-${row[0].key}`}
          style={{
            flexDirection: "row",
            marginBottom: 8,
          }}
        >
          {row.map((emotion) => (
            <View
              key={`basic-emotion-container-${emotion.key}`}
              style={{
                marginRight: 8,
                flex: 1,
              }}
            >
              <EmotionButtonBasic
                emotion={emotion}
                onPress={onPress}
                selected={selectedEmotions
                  .map((d) => d.key)
                  .includes(emotion.key)}
              />
            </View>
          ))}
          {row.length === 1 && (
            <View
              style={{
                flex: 1,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
};
