import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DATE_FORMAT } from "@/constants/Config";
import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { RATING_KEYS } from "@/constants/Ratings";
import { useTemporaryLog } from "../temporaryLog";
import { SlideHeadline } from "../components/SlideHeadline";
import { SlideMoodButton } from "../components/SlideMoodButton";
import { isTrayVisible } from "../attachmentTray";

/**
 * Rating slide, always the first logger slide. Must render inside
 * `TemporaryLogProvider`.
 */
export const SlideMood = ({
  onChange,
}: {
  onChange: (rating: LogItem["rating"]) => void;
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const marginTop = getLogEditMarginTop();
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  // Buttons do not shrink with the slide; compact ones keep clear of the tray.
  const isCompact = isTrayVisible({
    photosCount: tempLog.data.photos?.length ?? 0,
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        width: "100%",
        position: "relative",
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View
        style={{
          flex: 1,
          marginTop,
        }}
      >
        {Platform.OS !== "web" && (
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            date={
              tempLog.data.dateTime
                ? new Date(tempLog.data.dateTime)
                : new Date()
            }
            mode="datetime"
            onConfirm={(date) => {
              setIsDatePickerVisible(false);
              tempLog.update({
                date: dayjs(date).format(DATE_FORMAT),
                dateTime: dayjs(date).toISOString(),
              });
              router.setParams({ dateTime: dayjs(date).toISOString() });
            }}
            onCancel={() => setIsDatePickerVisible(false)}
          />
        )}
        <SlideHeadline
          style={{
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {t("log_rating_question")}
        </SlideHeadline>
        <View
          style={{
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 32,
            width: "100%",
          }}
        >
          {RATING_KEYS.map((key) => (
            <SlideMoodButton
              key={key}
              rating={key}
              selected={tempLog?.data?.rating === key}
              isCompact={isCompact}
              onPress={() => onChange(key)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};
