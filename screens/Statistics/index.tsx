import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../hooks/useColors';
import { useLogs } from '../../hooks/useLogs';
import { useTranslation } from '../../hooks/useTranslation';
import { MoodAvgCard } from './MoodAvgCard';
import { MoodPeaksCard } from './MoodPeaksCard';

export const StatisticsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const { t } = useTranslation()
  const { state } = useLogs()

  // times of the last two weeks
  const items = Object.values(state.items).filter(item => {
    const date = new Date(item.date)
    return date.getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 14
  })

  return (
    <View
      style={{
        paddingTop: insets.top,
        flex: 1,
        backgroundColor: colors.statisticsBackground
      }}
    >
      <ScrollView style={{
        padding: 20,
      }}>
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom + 50,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              color: colors.text,
              fontWeight: 'bold',
              marginTop: 16,
            }}
          >{t('statistics_subtitle')}</Text>
          <Text
            style={{
              letterSpacing: -0.1,
              fontSize: 17,
              color: colors.textSecondary,
              marginTop: 8,
            }}
          >{t('statistics_description')}</Text>

          {items.length < 5 && (
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
              >{t('statistics_no_data', { count: 5 - items.length })}</Text>
            </View>
          )}

          {items.length >= 5 && (
            <>
              <MoodAvgCard items={items} />
              <MoodPeaksCard items={items} />
            </>
          )}

          {/* <FeedbackSection /> */}
        </View>
      </ScrollView>
    </View>
  );
}
