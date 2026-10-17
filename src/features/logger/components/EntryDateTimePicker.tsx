import { Clock } from "react-native-feather";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { getShortItemDateTitle } from "@/lib/utils";
import { FooterPill } from "./FooterPill";
import type { EntryDateTimePickerProps } from "./entryDateTimePickerTypes";

/**
 * Entry time on web: shows the time only. `@expo/ui` has no web date
 * picker, and web never had one.
 */
export const EntryDateTimePicker = ({ value }: EntryDateTimePickerProps) => {
  const colors = useColors();
  const title = value === null ? "?" : getShortItemDateTitle(value);

  return (
    <FooterPill
      testID="logger-date"
      icon={<Clock width={18} height={18} color={colors.logHeaderText} />}
      label={title}
      accessibilityLabel={title}
      accessibilityHint={t("logger_date_hint")}
    />
  );
};
