import { Emotion } from "@/types";
import _ from "lodash";
import { View } from "react-native";
import { EmotionButtonAdvanced, EmotionButtonEmpty } from "./EmotionButtonAdvanced";

export const EmotionPage = ({
  emotions, onPress, selectedEmotions,
}: {
  emotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  selectedEmotions: Emotion[];
}) => {
  const chunks = _.chunk(emotions, 2).map(d => d.length === 1 ? [...d, { key: 'empty', label: '' } as Emotion] : d);

  return (
    <View
      style={{
        flexDirection: 'column',
        width: '100%',
        paddingHorizontal: 4,
        paddingTop: 12,
      }}
    >
      {chunks.map((chunk, index) => (
        <View
          key={`emotion-page-${index}`}
          style={{
            flexDirection: 'row',
            marginBottom: 2,
          }}
        >
          {chunk.map((emotion, index) => (
            emotion.key === 'empty' ? (
              <EmotionButtonEmpty key={`advanced-${emotion.key}-${index}`} />
            ) : (
              <EmotionButtonAdvanced
                key={`advanced-${emotion.key}-${index}`}
                emotion={emotion}
                onPress={onPress}
                selected={selectedEmotions.map(d => d.key).includes(emotion.key)}
                style={{
                  marginRight: chunk.indexOf(emotion) === 0 ? 6 : 0,
                  // when only one emotion is in the chunk, make it full width
                }} />
            )))}
        </View>
      ))}
    </View>
  );
};
