import { Text, View } from 'react-native';
import { t } from '@/helpers/translation';
import useColors from '../../../hooks/useColors';

export const ResultsSection = ({
  count
}: {
  count: number;
}) => {
  const colors = useColors();

  return (
    <View>
      <View
        style={{
          marginTop: 8,
          marginBottom: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.textSecondary, opacity: 0.5 }}>{count} {t('calendar_filters_results')}</Text>
      </View>
    </View>
  );
};
