import { Text, View } from 'react-native';
import useColors from '../../hooks/useColors';
import { useTranslation } from '../../hooks/useTranslation';

export const EmptyPlaceholder = ({
  count
}: {
  count: number;
}) => {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.statisticsNoDataBorder,
        borderStyle: 'dashed',
        marginTop: 32,
        padding: 16,
        borderRadius: 8,
        minHeight: 120,
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
  );
};
