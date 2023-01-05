import Button from "@/components/Button"
import { PageModalLayout } from "@/components/PageModalLayout"
import { MAX_ENTRIES_PER_DAY } from "@/constants/Config"
import { t } from "@/helpers/translation"
import { useAnalytics } from "@/hooks/useAnalytics"
import useColors from "@/hooks/useColors"
import { useLogState } from "@/hooks/useLogs"
import { getDayDateTitle } from "@/lib/utils"
import dayjs from "dayjs"
import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RootStackScreenProps } from "../../../types"
import { Entry } from "./Entry"
import { Header } from "./Header"

const Entries = ({
  date,
  isExpanded,
}: {
  date: string
  isExpanded: boolean,
}) => {
  const logState = useLogState()

  const _items = logState.items
    .filter((item) => dayjs(item.dateTime).isSame(date, 'day'))
    .sort((a, b) => dayjs(a.dateTime).isBefore(dayjs(b.dateTime)) ? -1 : 1)

  return (
    <View
      style={{
        marginBottom: 8,
      }}
    >
      {_items.map((item) => (
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
            <Entries isExpanded={isExpanded} date={date} />
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
