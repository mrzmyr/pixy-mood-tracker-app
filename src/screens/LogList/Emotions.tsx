import { EMOTIONS } from '@/components/Logger/config';
import { EmotionIndicator } from '@/components/Logger/slides/SlideEmotions/EmotionsIndicator';
import useColors from '@/hooks/useColors';
import { LogItem } from '@/hooks/useLogs';
import { Emotion } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { t } from 'i18n-js';
import _ from 'lodash';
import { Text, View } from 'react-native';
import { SectionHeader } from './SectionHeader';

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
          marginBottom: 8,
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
  const navigation = useNavigation();

  const emotionsByKey = _.keyBy(EMOTIONS, 'key');
  let emotions = _.get(item, 'emotions', []).map((e: Emotion['key']) => ({
    key: e,
    category: emotionsByKey[e].category,
    order: EMOTIONS_CATEGORY_ORDER[emotionsByKey[e].category],
  }));

  return (
    <View
      style={{
      }}
    >
      <SectionHeader
        title={t('view_log_emotions')}
        onEdit={() => {
          navigation.navigate('LogEdit', {
            id: item.id,
            step: 'emotions',
          });
        }}
      />
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
              paddingTop: 4,
              paddingBottom: 8,
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 17 }}>{t('view_log_emotions_empty')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
