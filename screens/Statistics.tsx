import dayjs from 'dayjs';
import { t } from 'i18n-js';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import useColors from '../hooks/useColors';
import useFeedbackModal from '../hooks/useFeedbackModal';
import { useLogs } from '../hooks/useLogs';
import useScale from '../hooks/useScale';
import { useSettings } from '../hooks/useSettings';

const keys = ['extremely_good', 'very_good', 'good', 'neutral', 'bad', 'very_bad', 'extremely_bad']

const FeedbackSection = () => {
  const colors = useColors()
  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  return (
    <View style={{
      marginTop: 32,
      padding: 8,
    }}>
      <FeedbackModal />
      <Text style={{
        fontSize: 17,
        marginBottom: 8,
        fontWeight: 'bold',
        color: colors.text
      }}>⚠️ {t('statistics_experimental_title')}</Text>
      <Text style={{
        fontSize: 15,
        marginBottom: 16,
        lineHeight: 22,
        color: colors.textSecondary
      }}>{t('statistics_experimental_body')}</Text>
      <Button
        onPress={() => {
          showFeedbackModal({ type: 'idea' })
        }}
        type='primary'
      >{t('statistics_experimental_button')}</Button>
    </View>
  )
}

const MonthItem = ({
  index,
  data,
  date,
}) => {
  const { settings } = useSettings()
  const colors = useColors()
  let { colors: scaleColors } = useScale(settings.scaleType)

  return (
    <View
      style={{
        marginBottom:16,
        paddingTop: 12,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
      }}
      testID={`statistics-item-${index}`}
    >
      <Text
        style={{
          fontSize: 17,
          color: colors.text,
          fontWeight: 'bold',
          marginBottom: 24,
        }}
      >{dayjs(date).format('MMMM, YYYY')}</Text>
      {data._total < 1 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              opacity: 0.5,
              marginBottom: 8,
            }}
          >
            {t('statistics_experimental_not_enough_data')}
          </Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {keys.map(key => (
            <View
              key={key}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                height: 32,
                width: `${data[key] / data._total * 100}%`,
                backgroundColor: scaleColors[key].background,
              }}
            >
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export const StatisticsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const { state } = useLogs()

  const lastYearItems = {}
  const lastYearRatings = {}

  for (let i = 0; i < 12; i++) {
    const month = dayjs().subtract(i, 'month').startOf('month')
    const monthName = month.format('YYYY-MM-DD')
    const monthItems = Object.keys(state.items).filter(date => dayjs(date).isSame(month, 'month')).map(date => state.items[date])
    lastYearItems[monthName] = monthItems
    if(!lastYearRatings[monthName]) lastYearRatings[monthName] = {}
    lastYearRatings[monthName]._total = 0;
    monthItems.forEach((item) => {
      if(!lastYearRatings[monthName][item.rating]) lastYearRatings[monthName][item.rating] = 0
      lastYearRatings[monthName][item.rating]++
      lastYearRatings[monthName]._total += 1
    })
  }

  return (
    <View
      style={{
        paddingTop: insets.top,
        flex: 1,
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
              fontSize: 32,
              color: colors.text,
              fontWeight: 'bold',
              marginTop: 32,
              marginBottom: 24,
            }}
          >{t('statistics_last_12_months')}</Text>

          {Object.keys(lastYearRatings).map((date, index) => (
            <MonthItem
              key={index}
              index={index}
              data={lastYearRatings[date]}
              date={date}
            />
          ))}

          <FeedbackSection />
        </View>
      </ScrollView>
    </View>
  );
}
