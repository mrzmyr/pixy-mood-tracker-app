import dayjs from 'dayjs';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { FactSheet } from '../components/Statistics/FactSheet';
import { PeopleList } from '../components/Statistics/PeopleList';
import { PlacesList } from '../components/Statistics/PlacesList';
import useColors from '../hooks/useColors';
import useFeedbackModal from '../hooks/useFeedbackModal';
import useHaptics from "../hooks/useHaptics";
import { LogItem, useLogs } from '../hooks/useLogs';
import useScale from '../hooks/useScale';
import { useSettings } from '../hooks/useSettings';
var relativeTime = require('dayjs/plugin/relativeTime')
dayjs.extend(relativeTime)

const SmallButton = ({
  children,
  onPress,
}: {
  children: React.ReactNode,
  onPress: () => void
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

  let lastBadDay: LogItem = null;
  let lastGoodDay: LogItem = null;
  
  const items = Object.keys(state.items).filter(key => {
    return (
      dayjs(state.items[key].date).isAfter(thisMonthStart) && 
      dayjs(state.items[key].date).isBefore(thisMonthEnd)
    )
  }).map(key => state.items[key])

  Object
    .keys(state.items)
    .sort((a,b) => {
      const aDate = dayjs(a)
      const bDate = dayjs(b)
      if (aDate.isBefore(bDate)) return -1
      if (aDate.isAfter(bDate)) return 1
      return 0
    })
    .forEach(key => {
      const item = state.items[key]

      if(['very_bad', 'extremely_bad'].includes(item.rating)) {
        lastBadDay = item;
      }

      if(['very_good', 'extremely_good'].includes(item.rating)) {
        lastGoodDay = item;
      }
    })

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

  let totalGoodDays = 0;
  if(ratings['extremely_good']) totalGoodDays += ratings['extremely_good']
  if(ratings['very_good']) totalGoodDays += ratings['very_good']
  if(ratings['good']) totalGoodDays += ratings['good']
  let totalBadDays = 0;
  if(ratings['extremely_bad']) totalBadDays += ratings['extremely_bad']
  if(ratings['very_bad']) totalBadDays += ratings['very_bad']
  if(ratings['bad']) totalBadDays += ratings['bad']
  let totalNeutralDays = 0;
  if(ratings['neutral']) totalNeutralDays += ratings['neutral']
  
  const { settings } = useSettings()
  let { colors: scaleColors } = useScale(settings.scaleType)
  
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
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom + 50,
          }}
        >
          <View style={{
            flex: 1,
            justifyContent: 'flex-start',
            backgroundColor: colors.background,
          }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              marginBottom: 16,
              color: colors.text,
            }}>{dayjs().format('MMMM YYYY')}</Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              margin: -5,
            }}
          >
            <FactSheet
              color={scaleColors.very_good}
              title='Good Days'
              body={`${totalGoodDays}`}
            />
            <FactSheet
              color={scaleColors.very_bad}
              title='Bad Days'
              body={`${totalBadDays}`}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              margin: -5,
            }}
          >
            {lastGoodDay && (
              <FactSheet
                color={colors.textSecondary}
                title='Last Good Day'
                body={dayjs().to(dayjs(lastGoodDay.date))}
              />
            )}
            {lastBadDay && (
              <FactSheet
                color={colors.textSecondary}
                title='Last Bad Day'
                body={dayjs().to(dayjs(lastBadDay.date))}
              />
            )}
          </View>

          {/* <ModalHeader
            title={currentMonth.format('MMMM YYYY')}
            right={
              <SmallButton
                onPress={() => setCurrentMonth(currentMonth.add(1, 'month'))}
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
          /> */}

        <PeopleList items={items} />
        <PlacesList items={items} />

        <View style={{
          marginTop: 32,
        }}>
          <Text style={{
            fontSize: 17,
            marginBottom: 8,
            fontWeight: 'bold',
            color: colors.text
          }}>⚠️ Statistics are currently experimental.</Text>
          <Text style={{
            fontSize: 15,
            marginBottom: 16,
            color: colors.textSecondary
          }}>Do you have some insights you want to know about your tracking? Please send me your idea. I read everyone of them. If you add your contact details I will answer you.</Text>
          <Button
            onPress={() => {
              showFeedbackModal({ type: 'idea' })
            }}
            type='secondary'
          >Send Feedback</Button>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}
