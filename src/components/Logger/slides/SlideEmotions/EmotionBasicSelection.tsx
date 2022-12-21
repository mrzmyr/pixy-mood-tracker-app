import LinkButton from "@/components/LinkButton";
import { t } from "@/helpers/translation";
import useFeedbackModal from "@/hooks/useFeedbackModal";
import { Emotion } from "@/types";
import _ from "lodash";
import { View, ViewStyle } from "react-native";
import { EmotionButtonBasic } from "./EmotionButtonBasic";

export const EmotionBasicSelection = ({
  emotions, selectedEmotions, onPress, style = {},
}: {
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  style?: ViewStyle;
}) => {
  const { Modal, show } = useFeedbackModal();

  const rows = _.chunk(_.orderBy(emotions, e => {
    return {
      'good': 1,
      'neutral': 0,
      'bad': -1,
    }[e.category]
  }, ['desc']), 2);

  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 120,
        ...style,
      }}
    >
      <Modal />

      {rows.map((row, index) => (
        <View
          key={`basic-emotion-row-${index}`}
          style={{
            flexDirection: 'row',
            marginBottom: 8,
          }}
        >
          {row.map((emotion, index) => (
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
                selected={selectedEmotions.map(d => d.key).includes(emotion.key)}
              />
            </View>
          ))}
          {row.length === 1 && (
            <View
              style={{
                flex: 1,
              }} />
          )}
        </View>
      ))}

      <LinkButton
        type="secondary"
        onPress={() => show({ type: 'idea' })}
        style={{
          marginTop: 20,
        }}
      >
        {t('give_feedback')}
      </LinkButton>
    </View>
  );
};
