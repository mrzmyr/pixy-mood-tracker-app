import { Text, View } from 'react-native';
import useColors from '../../../hooks/useColors';
import { useTranslation } from '../../../hooks/useTranslation';

export const ResultsSection = ({
  count
}: {
  count: number;
}) => {
  const { t } = useTranslation();
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
