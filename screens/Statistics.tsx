import dayjs from 'dayjs';
import { t } from 'i18n-js';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import useColors from '../hooks/useColors';
import useFeedbackModal from '../hooks/useFeedbackModal';
import useHaptics from "../hooks/useHaptics";
import { LogItem, useLogs } from '../hooks/useLogs';
import useScale from '../hooks/useScale';
import { useSettings } from '../hooks/useSettings';

const SmallButton = ({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode,
  onPress: () => void,
  style?: ViewStyle,
}) => {
  const colors = useColors()
  const haptics = useHaptics()

  return (
    <Pressable
      style={({ pressed }) => [{
        padding: 8,
        paddingRight: 8,
        paddingLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderRadius: 5,
        opacity: pressed ? 0.8 : 1,
        ...style,
      }]}
      onPress={async () => {
        await haptics.selection()
        onPress()
      }}
      accessibilityRole={'button'}
    >
      {children}
    </Pressable>
  )
}

export const StatisticsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();
  
  const { state } = useLogs()

  const ratings = {}
  const lastMonthRatings = {}
  const lastWeekRating = {}
  const lastWeekItems: LogItem[] = []

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'))
  
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

  const thisMonthStart = currentMonth.startOf('month')
  const thisMonthEnd = currentMonth.endOf('month')

  const lastWeekStart = dayjs().startOf('week').subtract(1, 'week')
  const lastWeekDays = []
  const lastWeekEnd = dayjs().endOf('week').subtract(1, 'week')

  for (let i = 0; i < 7; i++) {
    lastWeekDays.push(lastWeekStart.add(i, 'day').format('YYYY-MM-DD'))
  }

  const lastMonthStart = dayjs().subtract(1, 'month').startOf('month')
  const lastMonthEnd = dayjs().subtract(1, 'month').endOf('month')
  
  const items = Object.keys(state.items).filter(key => {
    return (
      dayjs(state.items[key].date).isAfter(thisMonthStart) && 
      dayjs(state.items[key].date).isBefore(thisMonthEnd)
    )
  }).map(key => state.items[key])

  Object
    .keys(items)
    .sort((a,b) => {
      const aDate = dayjs(a)
      const bDate = dayjs(b)
      if (aDate.isBefore(bDate)) return -1
      if (aDate.isAfter(bDate)) return 1
      return 0
    })
    .forEach(key => {
      const item = items[key]

      if(!ratings[item.rating]) ratings[item.rating] = 0

      if(!lastWeekRating[item.rating]) {
        lastWeekRating[item.rating] = 0
        lastWeekItems.push(item)
      }

      if(!lastMonthRatings[item.rating]) {
        lastMonthRatings[item.rating] = 0
      }

      if(
        dayjs(item.date).isAfter(lastWeekStart) &&
        dayjs(item.date).isBefore(lastWeekEnd)
      ) {
        lastWeekRating[item.rating]++
      }

      if(
        dayjs(item.date).isAfter(lastMonthStart) &&
        dayjs(item.date).isBefore(lastMonthEnd)
      ) {
        lastMonthRatings[item.rating]++
      }

      ratings[item.rating]++
    })

  const total = Object.keys(ratings).reduce((acc, key) => acc + ratings[key], 0)
  const { settings } = useSettings()
  let { colors: scaleColors } = useScale(settings.scaleType)

  const keys = ['extremely_good', 'very_good', 'good', 'neutral', 'bad', 'very_bad', 'extremely_bad']

  return (
    <View
      style={{
        paddingTop: insets.top,
        flex: 1,
      }}
    >
      <FeedbackModal />
      <ScrollView style={{
        padding: 20,
      }}>
          {/* <ModalHeader
            title={currentMonth.format('MMMM YYYY')}
            right={
              <SmallButton
                style={{
                  opacity: currentMonth.isSame(dayjs().startOf('month'), 'month') ? 0.5 : 1,
                }}
                onPress={() => {
                  if(!currentMonth.isSame(dayjs().startOf('month'), 'month')) {
                    setCurrentMonth(currentMonth.add(1, 'month'))
                  }
                }}
              >
                <ChevronRight width={24} height={24} color={colors.secondaryButtonTextColor} />
              </SmallButton>
            }
            left={
              <SmallButton
                onPress={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
              >
                <ChevronLeft width={24} height={24} color={colors.secondaryButtonTextColor} />
              </SmallButton>
            }
          />
         */}
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
          <View>
            {Object.keys(lastYearRatings).map((date, index) => (
            <View
              key={index}
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
              {lastYearRatings[date]._total < 1 ? (
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
                    borderRadius: 4,
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
                        width: `${lastYearRatings[date][key] / lastYearRatings[date]._total * 100}%`,
                        backgroundColor: scaleColors[key].background,
                      }}
                    >
                    </View>
                  ))}
                </View>
              )}
            </View>
            ))}
          </View>

        <View style={{
          marginTop: 32,
          padding: 8,
        }}>
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
        </View>
      </ScrollView>
    </View>
  );
}
