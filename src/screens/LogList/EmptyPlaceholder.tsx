import { Text, View } from "react-native";
import { t } from "@/helpers/translation";
import useColors from "../../hooks/useColors";


export const EmptyPlaceholder = ({ }: {}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
      }}
    >
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
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            color: colors.statisticsNoDataText,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >{t('entries_no_data')}</Text>
      </View>
    </View>
  );
};
