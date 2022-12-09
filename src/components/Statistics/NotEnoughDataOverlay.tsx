import { Text, View } from "react-native";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";

export const NotEnoughDataOverlay = ({
  limit,
  showSubtitle = true,
}: {
  limit?: number;
  showSubtitle?: boolean;
}) => {
  const colors = useColors()

  const subtitleKey = (
    limit ? (
      limit === 1 ?
        'statistics_not_enough_data_subtitle_singular' :
        'statistics_not_enough_data_subtitle_plural'
    ) :
      'statistics_not_enough_data_subtitle_without_count'
  )

  return (
    <View style={{
      position: 'absolute',
      top: -16,
      left: -20,
      right: -20,
      bottom: -16,
      backgroundColor: colors.statisticsNotEnoughDataBackdrop,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      zIndex: 999,
    }}>
      <Text style={{
        fontSize: 24,
        textAlign: 'center',
        paddingHorizontal: 20,
      }}>
        🧟‍♀️
      </Text>
      <Text style={{
        color: colors.statisticsNotEnoughDataTitle,
        fontSize: 17,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
        marginTop: 8,
        marginBottom: 2,
      }}>
        {t('statistics_not_enough_data_title')}
      </Text>
      {showSubtitle && (
        <Text style={{
          color: colors.statisticsNotEnoughDataSubtitle,
          fontSize: 14,
          textAlign: 'center',
          paddingHorizontal: 20,
          lineHeight: 20,
        }}>
          {t(subtitleKey, { count: limit })}
        </Text>
      )}
    </View>
  );
}
