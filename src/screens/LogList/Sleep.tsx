import { SleepQualityIndicator } from '@/components/SleepQualityIndicator';
import { LogItem } from '@/hooks/useLogs';
import { t } from 'i18n-js';
import { View } from 'react-native';
import { SectionHeader } from './SectionHeader';

export const Sleep = ({
  item,
}: {
  item: LogItem;
}) => {
  if (!item.sleep?.quality) return null;

  return (
    <View
      style={{
      }}
    >
      <SectionHeader
        title={t('view_log_sleep')}
      />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        <SleepQualityIndicator
          value={item.sleep?.quality}
          style={{
            flex: 0,
            minWidth: 80,
            margin: -4,
          }}
        />
      </View>
    </View>
  );
};
