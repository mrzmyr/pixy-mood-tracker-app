import { useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import useColors from '../../hooks/useColors';
import { useFeedback } from '../../hooks/useFeedback';
import { useSegment } from '../../hooks/useSegment';
import { useTranslation } from '../../hooks/useTranslation';

const EMOJI_SCALE_IMAGES = [{
  emoji: '😍',
  active: require(`../../assets/images/emojis/smiling-face-with-heart-eyes_1f60d.png`),
  disabled: require(`../../assets/images/emojis/smiling-face-with-heart-eyes_1f60d-disabled.png`)
}, {
  emoji: '🎉',
  active: require(`../../assets/images/emojis/party-popper.png`),
  disabled: require(`../../assets/images/emojis/party-popper-disabled.png`)
}, {
  emoji: '😴',
  active: require(`../../assets/images/emojis/sleeping-face_1f634.png`),
  disabled: require(`../../assets/images/emojis/sleeping-face_1f634-disabled.png`)
}, {
  emoji: '👎',
  active: require(`../../assets/images/emojis/thumbs-down_1f44e.png`),
  disabled: require(`../../assets/images/emojis/thumbs-down_1f44e-disabled.png`)
}]

const CardFeedbackEmoji = ({ image, onPress }) => {
  const colors = useColors()

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 8,
        paddingBottom: 8,
        borderColor: colors.statisticsFeedbackBorder,
        marginLeft: 8,
        borderRadius: 4,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image style={{ 
        width: 20, 
        height: 20,
      }} source={image} />
    </TouchableOpacity>
  )
}
export const CardFeedback = ({
  type
}: {
  type: 'mood_avg' | 'mood_peaks';
}) => {
  const segment = useSegment();
  const colors = useColors();
  const { t } = useTranslation();
  const { send } = useFeedback();

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFeedback = (emoji) => {
    setLoading(true);
    const message = `${type}:  ${emoji}`;

    send({
      type: 'emoji',
      source: 'statistics',
      message: message,
    })
      .then(() => {
        setFeedbackSent(true);
      })
      .catch(() => {
        setFeedbackSent(false);
      })
      .finally(() => {
        setLoading(false);
      });
    segment.track('statistics_feedback_send', {
      text: message,
      emoji: emoji,
    });
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.statisticsFeedbackBorder,
        width: '100%',
      }}
    >
      {!loading && (
        <Text
          style={{
            letterSpacing: -0.1,
            fontSize: 14,
            fontWeight: '600',
            color: colors.statisticsFeedbackText,
          }}
        >
          {!feedbackSent ? t('statistics_feedback_question') : t('statistics_feedback_success')}
        </Text>
      )}
      {loading && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <ActivityIndicator size="small" color={colors.text} />
        </View>
      )}
      {!feedbackSent && !loading && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {EMOJI_SCALE_IMAGES.map((emojiScale, index) => (
            <CardFeedbackEmoji
              key={index}
              image={emojiScale.disabled}
              onPress={() => handleFeedback(emojiScale.emoji)}
            />
          ))}
        </View>
      )}
    </View>
  );
};
