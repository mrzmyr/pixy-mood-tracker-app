import { Host, Picker } from "@expo/ui";
import { Platform } from "react-native";
import { t } from "@/lib/translation";
import { QUICK_CHECK_IN_INTERVALS } from "@/constants/settings";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";

/**
 * Hours between quick check-ins as a native menu picker: SwiftUI menu on
 * iOS, Material dropdown on Android. Sized to its content for a row
 * accessory.
 */
export const IntervalPicker = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (hours: number) => void;
}) => (
  <Host
    matchContents
    seedColor={Platform.OS === "android" ? MATERIAL_SEED_COLOR : undefined}
  >
    <Picker
      testID="quick-check-in-every"
      selectedValue={value}
      onValueChange={onChange}
      appearance="menu"
    >
      {QUICK_CHECK_IN_INTERVALS.map((hours) => (
        <Picker.Item
          key={hours}
          label={t("quick_check_in_every_hours", { count: hours })}
          value={hours}
        />
      ))}
    </Picker>
  </Host>
);
