import { Text, View } from 'react-native';
import { t } from '@/helpers/translation';
import useColors from '../../hooks/useColors';
import { Subtitle } from './Subtitle';
import { Title } from './Title';

export const EmptyPlaceholder = ({
  count
}: {
  count: number;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <Title>{t('statistics_highlights')}</Title>
      <Subtitle>{t('statistics_highlights_description')}</Subtitle>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.statisticsNoDataBorder,
          borderStyle: 'dashed',
          padding: 16,
          borderRadius: 8,
          minHeight: 120,
          marginTop: 16,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            color: colors.statisticsNoDataText,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >{t('statistics_no_data', { count })}</Text>
      </View>
    </View>
  );
};
