import dayjs from "dayjs"
import { ScrollView, Text, View } from "react-native"
import Button from "@/components/Button"
import { MAX_ENTRIES_PER_DAY } from "@/constants/Config"
import { t } from "@/helpers/translation"
import { useAnalytics } from "../../hooks/useAnalytics"
import useColors from "../../hooks/useColors"
import { useLogState } from "../../hooks/useLogs"
import { RootStackScreenProps } from "../../../types"
import { Entry } from "./Entry"
import { Header } from "./Header"
import { FeedbackBox } from "./FeedbackBox"
import { EmptyPlaceholder } from "./EmptyPlaceholder"

export const DayView = ({ route, navigation }: RootStackScreenProps<'DayView'>) => {
  const colors = useColors()
  const { date } = route.params
  const logState = useLogState()
  const analytics = useAnalytics()

  const items = logState.items.filter((item) => dayjs(item.dateTime).isSame(dayjs(date), 'day'))

  const close = () => {
    analytics.track('day_close')
    navigation.goBack()
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
      }}
    >
      <Header
        title={dayjs(date).isSame(dayjs(), 'day') ? t('today') : dayjs(date).format('dddd, L')}
        onClose={close}
      />
      <ScrollView>
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          {items.map((item) => (
            <View
              key={item.id}
              style={{
                marginBottom: 16,
              }}
            >
              <Entry item={item} />
            </View>
          ))}
          {items.length === 0 && (
            <EmptyPlaceholder />
          )}
          {items.length >= MAX_ENTRIES_PER_DAY && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.logCardBackground,
                padding: 16,
                borderRadius: 8,
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
          <FeedbackBox prefix={"entries_feedback"} />
          {items.length < MAX_ENTRIES_PER_DAY && (
            <Button
              type="primary"
              style={{
              }}
              onPress={() => {
                navigation.navigate('LogCreate', {
                  date,
                })
              }}
            >{t('add_entry')}</Button>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
