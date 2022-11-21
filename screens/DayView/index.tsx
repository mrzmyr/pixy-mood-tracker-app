import dayjs from "dayjs"
import { ScrollView, View } from "react-native"
import Button from "../../components/Button"
import { t } from "../../helpers/translation"
import { useAnalytics } from "../../hooks/useAnalytics"
import useColors from "../../hooks/useColors"
import { useLogState } from "../../hooks/useLogs"
import { RootStackScreenProps } from "../../types"
import { Entry } from "./Entry"
import { Header } from "./Header"

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
        </View>
      </ScrollView>
    </View>
  )
}
