import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import useColors from '../../hooks/useColors';
import { useFeedback } from '../../hooks/useFeedback';
import useHaptics from '../../hooks/useHaptics';
import { useAnalytics } from '../../hooks/useAnalytics';
import { STATISTIC_TYPES } from '../../hooks/useStatistics';
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

const CardFeedbackEmoji = ({ image, onPress, selected }) => {
  const haptics = useHaptics()
  const colors = useColors()

  return (
    <Pressable
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
      onPress={async () => {
        await haptics.selection()
        onPress?.()
      }}
    >
      <Image style={{ 
        opacity: selected ? 1 : colors.statisticsFeedbackEmojiOpacity,
        width: 20, 
        height: 20,
      }} source={image} />
    </Pressable>
  )
}
export const CardFeedback = ({
  type,
  details
}: {
  type: typeof STATISTIC_TYPES[number],
  details: any;
}) => {
  const analytics = useAnalytics();
  const colors = useColors();
  const { t } = useTranslation();
  const { send } = useFeedback();

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [emojiSelected, setEmojiSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFeedback = (emoji) => {
    setLoading(true);
    setEmojiSelected(emoji);
    const message = `${type}:  ${emoji} \n ${JSON.stringify(details)}`;

    send({
      type: 'emoji',
      source: 'statistics',
      message: message,
    })
      .then(() => {
        setFeedbackSent(true);
      })
      .catch(() => {
        setEmojiSelected(null);
        setFeedbackSent(false);
      })
      .finally(() => {
        setLoading(false);
      });
    analytics.track('statistics_feedback_send', {
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
            color: colors.statisticsFeedbackText,
            paddingTop: 8,
            paddingBottom: 8,
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
          <ActivityIndicator size={'small'} color={colors.loadingIndicator} />
        </View>
      )}
      {!feedbackSent && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {EMOJI_SCALE_IMAGES.map((emojiScale, index) => (
            <CardFeedbackEmoji
              key={index}
              selected={emojiSelected === emojiScale.emoji}
              image={emojiSelected === emojiScale.emoji ? emojiScale.active : emojiScale.disabled}
              onPress={() => handleFeedback(emojiScale.emoji)}
            />
          ))}
        </View>
      )}
    </View>
  );
};
