import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { useState } from "react";
import { View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { DATE_FORMAT } from "../../../constants/Config";
import { getLogEditMarginTop } from "../../../helpers/responsive";
import { t } from "../../../helpers/translation";
import useColors from "../../../hooks/useColors";
import useHaptics from "../../../hooks/useHaptics";
import { LogItem, RATING_KEYS } from "../../../hooks/useLogs";
import { useTemporaryLog } from "../../../hooks/useTemporaryLog";
import { getItemDateTitle } from "../../../lib/utils";
import { SlideHeadline } from "../components/SlideHeadline";
import { SlideRatingButton } from "../components/SlideRatingButton";

export const SlideRating = ({
  onChange,
}: {
  onChange: (rating: LogItem['rating']) => void;
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const haptics = useHaptics();
  const navigation = useNavigation();

  const marginTop = getLogEditMarginTop()
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const time = tempLog.data.dateTime !== null ? getItemDateTitle(tempLog.data.dateTime) : ''

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.logBackground,
      width: '100%',
    }}>
      <View
        style={{
          flex: 1,
          marginTop
        }}
      >
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          date={tempLog.data.dateTime ? new Date(tempLog.data.dateTime) : new Date()}
          mode="datetime"
          onConfirm={date => {
            setDatePickerVisibility(false)
            tempLog.set(log => ({
              ...log,
              date: dayjs(date).format(DATE_FORMAT),
              dateTime: dayjs(date).toISOString(),
            }))
            navigation.setParams({
              date: dayjs(date).format(DATE_FORMAT),
            })
          }}
          onCancel={() => setDatePickerVisibility(false)}
        />
        <View
          style={{
            width: '100%',
            alignItems: 'center',
          }}
        >
          <SlideHeadline>{t('log_rating_question')}</SlideHeadline>
        </View>
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 32,
            width: '100%',
          }}
        >
          {RATING_KEYS.map((key, index) => (
            <SlideRatingButton
              key={key}
              rating={key as LogItem['rating']}
              selected={tempLog?.data?.rating === key}
              onPress={() => onChange(key as LogItem['rating'])}
            />
          ))}
        </View>
      </View>
    </View>
  )
}