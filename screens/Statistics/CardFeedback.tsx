import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, View } from 'react-native';
import Button from '../../components/Button';
import TextArea from '../../components/TextArea';
import { STATISTICS_FEEDBACK_URL } from '../../constants/API';
import { locale, t } from '../../helpers/translation';
import { useAnalytics } from '../../hooks/useAnalytics';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { useSettings } from '../../hooks/useSettings';
import { STATISTIC_TYPES } from '../../hooks/useStatistics';
import pkg from '../../package.json';
import * as StoreReview from 'expo-store-review';

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
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 8,
        paddingBottom: 8,
        borderRadius: 8,
        backgroundColor: colors.secondaryButtonBackground,
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
  details = {},
}: {
  type: typeof STATISTIC_TYPES[number],
  details?: any;
}) => {
  const analytics = useAnalytics();
  const colors = useColors();
  const { settings } = useSettings()

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [emojiSelected, setEmojiSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [comment, setComment] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const onSendDone = () => {
    setLoading(false);
    setShowTextInput(false)
    setFeedbackSent(true)
    setEmojiSelected(null)

    setTimeout(() => {
      setFeedbackSent(false)
    }, 5000)
  }

  const send = async (emoji) => {
    setLoading(true);

    const metaData = {
      date: new Date().toISOString(),
      locale: locale,
      version: pkg.version,
      os: Platform.OS,
      deviceId: __DEV__ ? '__DEV__' : settings.deviceId,
    }

    const body = {
      type,
      emoji,
      comment,
      details,
      ...metaData,
    }

    console.log('Sending statistics feedback', body);

    analytics.track('statistics_feedback', body);

    return fetch(STATISTICS_FEEDBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .finally(() => onSendDone())
  }

  const handleFeedback = async (emoji) => {
    if (loading) return;

    setEmojiSelected(emoji);

    if (emoji === emojiSelected) {
      setEmojiSelected(null)
      setShowTextInput(false)
      return;
    }

    if (['👎', '😴'].includes(emoji)) {
      setShowTextInput(true);
    } else {
      send(emoji);
      if (await StoreReview.hasAction()) {
        analytics.track('statistics_feedback_store_review_request');
        StoreReview.requestReview().then(() => {
          analytics.track('statistics_feedback_store_review_done');
        }).catch(() => {
          analytics.track('statistics_feedback_store_review_error');
        })
      }
    }
  };

  return (
    <View
      style={{
        flexDirection: 'column',
        marginTop: 32,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.cardBorder,
        marginLeft: -20,
        marginRight: -20,
        paddingLeft: 20,
        paddingRight: 20,
        marginBottom: -8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {!loading && (
          <>
            <Text
              style={{
                fontSize: 14,
                color: colors.statisticsFeedbackText,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              {!feedbackSent ? t('statistics_feedback_question') : `😘 ${t('statistics_feedback_thanks')}`}
            </Text>
          </>
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
              <View
                style={{
                  marginRight: index === EMOJI_SCALE_IMAGES.length - 1 ? 0 : 8,
                }}
              >
                <CardFeedbackEmoji
                  key={index}
                  selected={emojiSelected === emojiScale.emoji}
                  image={emojiSelected === emojiScale.emoji ? emojiScale.active : emojiScale.disabled}
                  onPress={() => handleFeedback(emojiScale.emoji)}
                />
              </View>
            ))}
          </View>
        )}
      </View>
      {showTextInput && !loading && (
        <View
          style={{
            marginTop: 8,
          }}
        >
          <TextArea
            placeholder={t('statistics_feedback_placeholder')}
            value={comment}
            onChange={setComment}
            style={{
              paddingTop: 12,
              padding: 12,
              marginTop: 8,
              borderRadius: 8,
              height: 100,
            }}
          />
          <Button
            onPress={() => send(emojiSelected)}
            style={{
              marginTop: 8,
            }}
          >{t('send')}</Button>
        </View>
      )}
    </View>
  );
};
