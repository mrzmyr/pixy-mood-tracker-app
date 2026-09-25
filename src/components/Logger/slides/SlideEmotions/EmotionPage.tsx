import type { Emotion } from "@/types";
import chunkArray from "lodash/chunk";
import { View } from "react-native";
import {
  EmotionButtonAdvanced,
  EmotionButtonEmpty,
} from "./EmotionButtonAdvanced";

export const EmotionPage = ({
  emotions,
  onPress,
  selectedEmotions,
}: {
  emotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  selectedEmotions: Emotion[];
}) => {
  const chunks = chunkArray(emotions, 2).map((d) =>
    d.length === 1
      ? [
          ...d,
          // SAFETY: the "empty" placeholder is only rendered by EmotionButtonEmpty, which reads no Emotion fields.
          { key: "empty", label: "" } as Emotion,
        ]
      : d
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
          key={`emotion-page-${chunk[0].key}`}
          style={{
            flexDirection: "row",
            marginBottom: 2,
          }}
        >
          {chunk.map((emotion) =>
            emotion.key === "empty" ? (
              <EmotionButtonEmpty key={`advanced-${emotion.key}`} />
            ) : (
              <EmotionButtonAdvanced
                key={`advanced-${emotion.key}`}
                emotion={emotion}
                onPress={onPress}
                selected={selectedEmotions
                  .map((d) => d.key)
                  .includes(emotion.key)}
                style={{
                  marginRight: chunk.indexOf(emotion) === 0 ? 6 : 0,
                  // when only one emotion is in the chunk, make it full width
                }}
              />
            )
          )}
        </View>
      ))}
    </View>
  );
};
