import { EMOTIONS } from '@/components/Logger/config';
import useColors from '@/hooks/useColors';
import useHaptics from '@/hooks/useHaptics';
import { LogItem } from '@/hooks/useLogs';
import useScale from '@/hooks/useScale';
import { Emotion } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { t } from 'i18n-js';
import _ from 'lodash';
import { Text, View, useColorScheme } from 'react-native';
import { Headline } from './Headline';

const EMOTIONS_CATEGORY_ORDER = {
  very_positive: 0,
  positive: 1,
  neutral: 2,
  negative: 3,
  very_negative: 4,
}

const EmotionItem = ({
  emotion,
  onPress,
}: {
  emotion: any,
  onPress: () => void,
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();

  const scale = useScale()
  const colorMapping = {
    very_good: scale.colors.very_good,
    good: scale.colors.very_good,
    neutral: scale.colors.neutral,
    bad: scale.colors.very_bad,
    very_bad: scale.colors.very_bad,
  }

  const color = colorMapping[emotion.category]

  return (
    <View>
      <View
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          paddingLeft: 12,
          backgroundColor: colors.logCardBackground,
          borderWidth: 1,
          borderColor: colors.logCardBorder,
          marginRight: 8,
          marginTop: 8,
          borderRadius: 12,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 8,
            height: 10,
            backgroundColor: color.background,
            borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
            borderWidth: 1,
            borderRadius: 100,
            marginRight: 10,
            paddingRight: 8,
          }}
        />
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
          }}
        >{t(`log_emotion_${emotion.key}`)}</Text>
      </View>
    </View>
  );
};


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
            <EmotionItem
              key={emotion.key}
              emotion={emotion}
              onPress={() => {
                // @ts-ignore
                navigation.navigate('LogEdit', { id: item.id, step: 'emotions' });
              }}
            />
          );
        }) : (
          <View
            style={{
              padding: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 17 }}>{t('view_log_emotions_empty')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
