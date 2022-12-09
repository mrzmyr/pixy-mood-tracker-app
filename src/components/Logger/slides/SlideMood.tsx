import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DATE_FORMAT } from "@/constants/Config";
import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { LogItem, RATING_KEYS } from "@/hooks/useLogs";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import { SlideHeadline } from "../components/SlideHeadline";
import { SlideMoodButton } from "../components/SlideMoodButton";

export const SlideMood = ({
  onChange,
}: {
  onChange: (rating: LogItem['rating']) => void;
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const marginTop = getLogEditMarginTop()
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.logBackground,
      width: '100%',
      position: 'relative',
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 20,
    }}>
      <View
        style={{
          flex: 1,
          marginTop
        }}
      >
        {Platform.OS !== 'web' && (
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            date={tempLog.data.dateTime ? new Date(tempLog.data.dateTime) : new Date()}
            mode="datetime"
            onConfirm={date => {
              setDatePickerVisibility(false)
              tempLog.update({
                date: dayjs(date).format(DATE_FORMAT),
                dateTime: dayjs(date).toISOString(),
              })
              navigation.setParams({
                date: dayjs(date).format(DATE_FORMAT),
              })
            }}
            onCancel={() => setDatePickerVisibility(false)}
          />
        )}
        <SlideHeadline
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >{t('log_rating_question')}</SlideHeadline>
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
            <SlideMoodButton
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