import { EMOTIONS } from '@/components/Logger/config';
import { EmotionIndicator } from '@/components/Logger/slides/SlideEmotions/EmotionsIndicator';
import useColors from '@/hooks/useColors';
import { LogItem } from '@/hooks/useLogs';
import { Emotion } from '@/types';
import { t } from 'i18n-js';
import _ from 'lodash';
import { Text, View } from 'react-native';
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
}: {
  emotion: any,
}) => {
  const colors = useColors();

  return (
    <View>
      <View
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: colors.logCardBackground,
          borderWidth: 1,
          borderColor: colors.logCardBorder,
          marginRight: 8,
          marginTop: 8,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <EmotionIndicator category={emotion.category} />
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
