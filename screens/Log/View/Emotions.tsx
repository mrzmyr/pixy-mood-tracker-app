import { useNavigation } from '@react-navigation/native';
import { t } from 'i18n-js';
import _ from 'lodash';
import { Pressable, Text, View } from 'react-native';
import { Emotion, EMOTIONS } from '../../../components/Logger/config';
import useColors from '../../../hooks/useColors';
import useHaptics from '../../../hooks/useHaptics';
import { LogItem } from '../../../hooks/useLogs';
import { Headline } from './Headline';

const EMOTIONS_CATEGORY_ORDER = {
  very_positive: 0,
  positive: 1,
  neutral: 2,
  negative: 3,
  very_negative: 4,
}

export const Emotions = ({
  item,
}: {
  item: LogItem;
}) => {
  const colors = useColors();
  const navigation = useNavigation();
  const haptics = useHaptics();

  const emotionsByKey = _.keyBy(EMOTIONS, 'key');
  let emotions = _.get(item, 'emotions', []).map((e: Emotion['key']) => ({
    key: e,
    category: emotionsByKey[e].category,
    order: EMOTIONS_CATEGORY_ORDER[emotionsByKey[e].category],
  }));

  return (
    <View
      style={{
        marginTop: 24,
      }}
    >
      <Headline>{t('view_log_emotions')}</Headline>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {item && emotions.length > 0 ? _.sortBy(emotions, 'order').map(emotion => {
          return (
            <Pressable
              key={emotion.key}
              onPress={async () => {
                await haptics.selection();
                navigation.navigate('LogEdit', { id: item.id, step: 'emotions' });
              }}
            >
              <View
                style={{
                  padding: 12,
                  paddingHorizontal: 16,
                  backgroundColor: colors.logCardBackground,
                  borderColor: colors.logCardBorder,
                  borderWidth: 1,
                  marginRight: 4,
                  marginTop: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 17,
                  }}
                >{t(`log_emotion_${emotion.key}`)}</Text>
              </View>
            </Pressable>
          );
        }) : (
          <View
            style={{
              padding: 8,
            }}
          >
            <Pressable
              onPress={async () => {
                await haptics.selection();
                navigation.navigate('LogEdit', { id: item.id, step: 'emotions' });
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 17 }}>{t('view_log_emotions_empty')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};
