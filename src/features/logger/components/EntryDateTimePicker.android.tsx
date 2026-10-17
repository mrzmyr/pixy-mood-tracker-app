import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import dayjs from "dayjs";
import { useState } from "react";
import { View } from "react-native";
import { Calendar, Clock } from "react-native-feather";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { formatItemTime, formatLocalizedDay } from "@/lib/utils";
import { clampToNow, withPickedDay } from "../entryDateTime";
import { FooterPill } from "./FooterPill";
import type { EntryDateTimePickerProps } from "./entryDateTimePickerTypes";

type OpenDialog = "date" | "time" | null;

const getDayLabel = (date: Date) => {
  if (dayjs(date).isSame(dayjs(), "day")) {
    return t("today");
  }
  if (dayjs(date).isSame(dayjs().subtract(1, "day"), "day")) {
    return t("yesterday");
  }
  return formatLocalizedDay(date, "short");
};

/**
 * Entry time on Android: a date pill opens the Material 3 date dialog, a
 * time pill opens the Material 3 time dialog. Days after today are
 * disabled; a picked time after now becomes now.
 */
export const EntryDateTimePicker = ({
  value,
  onChange,
}: EntryDateTimePickerProps) => {
  const colors = useColors();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const current = value === null ? new Date() : new Date(value);
  const dayLabel = getDayLabel(current);
  const timeLabel = formatItemTime(current.toISOString());
  const iconProps = { width: 18, height: 18, color: colors.logHeaderText };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <FooterPill
        testID="logger-date"
        icon={<Calendar {...iconProps} />}
        label={dayLabel}
        accessibilityLabel={dayLabel}
        accessibilityHint={t("logger_date_hint")}
        onPress={() => setOpenDialog("date")}
      />
      <FooterPill
        testID="logger-time"
        icon={<Clock {...iconProps} />}
        label={timeLabel}
        accessibilityLabel={timeLabel}
        accessibilityHint={t("logger_date_hint")}
        onPress={() => setOpenDialog("time")}
      />
      {openDialog !== null && (
        // Dialog presentation: opens on mount, so unmount it on close.
        <DateTimePicker
          presentation="dialog"
          mode={openDialog}
          value={current}
          maximumDate={new Date()}
          onValueChange={(_event, picked) => {
            setOpenDialog(null);
            const next =
              openDialog === "date" ? withPickedDay(current, picked) : picked;
            onChange(clampToNow(next).toISOString());
          }}
          onDismiss={() => setOpenDialog(null)}
        />
      )}
    </View>
  );
};
