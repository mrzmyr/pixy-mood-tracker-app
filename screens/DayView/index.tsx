import dayjs from "dayjs"
import { ScrollView, Text, View, ViewStyle } from "react-native"
import Button from "../../components/Button"
import LinkButton from "../../components/LinkButton"
import { MAX_ENTRIES_PER_DAY } from "../../constants/Config"
import { t } from "../../helpers/translation"
import { useAnalytics } from "../../hooks/useAnalytics"
import useColors from "../../hooks/useColors"
import useFeedbackModal from "../../hooks/useFeedbackModal"
import { useLogState } from "../../hooks/useLogs"
import { RootStackScreenProps } from "../../types"
import { Entry } from "./Entry"
import { Header } from "./Header"

const FeedbackBox = ({
  prefix,
  style = {},
}: {
  prefix: string;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  return (
    <View
      style={{
        marginTop: 32,
        borderTopWidth: 1,
        borderTopColor: colors.cardBorder,
        paddingTop: 32,
      }}
    >
      <View
        style={{
          marginBottom: 32,
          backgroundColor: colors.logCardBackground,
          paddingVertical: 16,
          paddingHorizontal: 20,
          borderRadius: 8,
          marginHorizontal: 8,
          ...style,
        }}
      >
        <FeedbackModal />
        <Text style={{
          fontSize: 17,
          marginBottom: 8,
          fontWeight: 'bold',
          color: colors.text
        }}>👷‍♀️ {t(`${prefix}_title`)}</Text>
        <Text style={{
          fontSize: 15,
          marginBottom: 16,
          lineHeight: 22,
          color: colors.textSecondary
        }}>{t(`${prefix}_body`)}</Text>
        <View
          style={{
            flexWrap: 'wrap',
            marginHorizontal: -20,
            paddingHorizontal: 12,
            marginBottom: -16,
            paddingBottom: 8,
            paddingTop: 8,
            borderTopColor: colors.logCardBorder,
            borderTopWidth: 1,
          }}
        >
          <LinkButton
            style={{
            }}
            onPress={() => {
              showFeedbackModal({ type: 'idea' });
            }}
          >{t(`${prefix}_button`)}</LinkButton>
        </View>
      </View>
    </View>
  );
};


export const EmptyPlaceholder = ({
}: {
  }) => {
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
          <FeedbackBox prefix={"entries_feedback"} />
        </View>
      </ScrollView>
    </View>
  )
}
