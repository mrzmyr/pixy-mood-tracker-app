import Button from "@/components/Button"
import { PageModalLayout } from "@/components/PageModalLayout"
import { MAX_ENTRIES_PER_DAY } from "@/constants/Config"
import { t } from "@/helpers/translation"
import { useAnalytics } from "@/hooks/useAnalytics"
import useColors from "@/hooks/useColors"
import useHaptics from "@/hooks/useHaptics"
import { useLogState } from "@/hooks/useLogs"
import { getDayDateTitle } from "@/lib/utils"
import { useNavigation } from "@react-navigation/native"
import dayjs from "dayjs"
import { Pressable, ScrollView, Text, View } from "react-native"
import { PlusCircle } from "react-native-feather"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RootStackScreenProps } from "../../../types"
import { Entry } from "./Entry"
import { FeedbackBox } from "./FeedbackBox"
import { Header } from "./Header"
import { useState } from "react"

type DayTime = 'morning' | 'afternoon' | 'evening'

const DayTimeEmpty = ({
  dayTime,
  date,
}: {
  dayTime: DayTime,
  date: string,
}) => {
  const colors = useColors()
  const navigation = useNavigation()
  const haptics = useHaptics()

  return (
    <Pressable
      style={({ pressed }) => ({
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.dayViewAddButtonBorder,
        flexDirection: 'row',
        borderRadius: 8,
        minHeight: 80,
        opacity: pressed ? 0.8 : 1,
        marginBottom: 8,
      })}
      onPress={() => {
        haptics.selection()
        navigation.navigate('LogCreate', {
          dateTime: {
            morning: dayjs(date).startOf('day').add(8, 'hour').toISOString(),
            afternoon: dayjs(date).startOf('day').add(13, 'hour').toISOString(),
            evening: dayjs(date).startOf('day').add(20, 'hour').toISOString(),
          }[dayTime],
        })
      }}
    >
      <PlusCircle width={20} height={20} color={colors.dayViewAddButtonText} />
      <Text
        style={{
          color: colors.dayViewAddButtonText,
          fontSize: 17,
          fontWeight: '600',
          marginLeft: 8,
        }}
      >{t('add_entry_for', { dayTime: t(dayTime) })}</Text>
    </Pressable>
  )
}

const DayTimeHeadline = ({
  dayTime,
}: {
  dayTime: DayTime;
}) => {
  const colors = useColors()

  return (
    <View
      style={{
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          height: 1,
          width: '100%',
          backgroundColor: colors.cardBorder,
          position: 'absolute',
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 17,
            fontWeight: '500',
            backgroundColor: colors.logBackground,
            paddingHorizontal: 16,
          }}
        >{t(dayTime)}</Text>
      </View>
    </View>
  )
}


const DayTimeItems = ({
  date,
  dayTime,
  isExpanded,
}: {
  date: string
  dayTime: DayTime,
  isExpanded: boolean,
}) => {
  const logState = useLogState()

  const _items = logState.items
    .filter((item) => dayjs(item.dateTime).isSame(date, 'day'))
    .sort((a, b) => dayjs(a.dateTime).isBefore(dayjs(b.dateTime)) ? -1 : 1)

  const entries = _items.filter((log) => {
    const logDate = dayjs(log.dateTime)

    if (dayTime === 'morning') return logDate.hour() < 12
    if (dayTime === 'afternoon') return logDate.hour() >= 12 && logDate.hour() < 18
    if (dayTime === 'evening') return logDate.hour() >= 18

    return false
  })

  return (
    <>
      {entries.length > 0 ? (
        <View
          style={{
            marginBottom: 8,
          }}
        >
          {entries.map((item) => (
            <View
              key={item.id}
              style={{
                marginBottom: 8,
              }}
            >
              <Entry
                isExpanded={isExpanded}
                item={item}
              />
            </View>
          ))}
        </View>
      ) : (
        <>
          {_items.length < MAX_ENTRIES_PER_DAY && (
            <View
              style={{
                marginBottom: 8,
              }}
            >
              <DayTimeEmpty date={date} dayTime={dayTime} />
            </View>
          )}
        </>
      )}
    </>
  )
}

export const DayView = ({ route, navigation }: RootStackScreenProps<'DayView'>) => {
  const colors = useColors()
  const { date } = route.params
  const logState = useLogState()
  const analytics = useAnalytics()
  const insets = useSafeAreaInsets()

  const items = logState.items
    .filter((item) => dayjs(item.dateTime).isSame(dayjs(date), 'day'))
    .sort((a, b) => dayjs(a.dateTime).isBefore(dayjs(b.dateTime)) ? -1 : 1)

  const close = () => {
    analytics.track('day_close')
    navigation.goBack()
  }

  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <PageModalLayout
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
      }}
    >
      <Header
        title={getDayDateTitle(date)}
        onExpand={() => {
          analytics.track('day_expand')
          setIsExpanded(!isExpanded)
        }}
        isExpanded={isExpanded}
        onClose={close}
      />
      <ScrollView>
        <View
          style={{
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              paddingBottom: insets.bottom + 20,
            }}
          >
            <DayTimeItems isExpanded={isExpanded} date={date} dayTime="morning" />
            <DayTimeItems isExpanded={isExpanded} date={date} dayTime="afternoon" />
            <DayTimeItems isExpanded={isExpanded} date={date} dayTime="evening" />
            {items.length >= MAX_ENTRIES_PER_DAY && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.logCardBackground,
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 17,
                    lineHeight: 24,
                  }}
                >{t('entries_reached_max', { max_count: MAX_ENTRIES_PER_DAY })}</Text>
              </View>
            )}
            <FeedbackBox
              prefix={"entries_feedback"}
              emoji='👷‍♀️'
            />
            {items.length < MAX_ENTRIES_PER_DAY && (
              <Button
                type="primary"
                style={{
                }}
                onPress={() => {
                  navigation.navigate('LogCreate', {
                    dateTime: dayjs(date).hour(dayjs().hour()).minute(dayjs().minute()).toISOString()
                  })
                }}
              >{t('add_entry')}</Button>
            )}
          </View>
        </View>
      </ScrollView>
    </PageModalLayout>
  )
}
