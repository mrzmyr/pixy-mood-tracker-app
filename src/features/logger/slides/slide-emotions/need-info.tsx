import { Alert, Pressable } from "react-native";
import Info from "lucide-react-native/icons/info";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { NeedInfoProps } from "./need-info-types";

/** Info button outside iOS and Android: the meaning in an alert. */
export const NeedInfo = ({
  title,
  description,
  met,
  unmet,
  testID,
}: NeedInfoProps) => {
  const colors = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t("log_needs_about", { need: title })}
      hitSlop={12}
      onPress={() =>
        Alert.alert(
          title,
          `${description}\n\n${t("log_needs_met")}: ${met.join(", ")}\n${t("log_needs_unmet")}: ${unmet.join(", ")}`
        )
      }
    >
      <Info size={18} color={colors.tint} />
    </Pressable>
  );
};
