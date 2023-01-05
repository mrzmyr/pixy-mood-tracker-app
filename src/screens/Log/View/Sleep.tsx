import { SlideSleepButton } from '@/components/Logger/slides/SlideSleepButton';
import { t } from 'i18n-js';
import { View } from 'react-native';
import { LogItem } from '../../../hooks/useLogs';
import { Headline } from './Headline';
import { useNavigation } from '@react-navigation/native';

export const Sleep = ({
  item,
}: {
  item: LogItem;
}) => {
  const navigation = useNavigation();

  if (!item.sleep?.quality) return null;

  return (
    <View
      style={{
        marginTop: 24,
      }}
    >
      <Headline>{t('view_log_sleep')}</Headline>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        <SlideSleepButton
          value={item.sleep?.quality}
          onPress={() => {
            navigation.navigate('LogEdit', { id: item.id, step: 'sleep' });
          }}
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
