import { View } from "react-native";
import Scale from "@/components/Scale";
import TextHeadline from "@/components/TextHeadline";
import { t } from "@/lib/translation";
import type { LogItem } from "@/features/logs";
import { useSetting } from "@/state/settings";

/**
 * Rating filter using the user's color scale; `onChange` receives the
 * tapped rating so the parent can toggle it.
 */
export const RatingSection = ({
  value,
  onChange,
}: {
  value: LogItem["rating"][];
  onChange: (value: LogItem["rating"]) => void;
}) => {
  const scaleType = useSetting("scaleType");

  return (
    <View
      style={{
        marginBottom: 16,
      }}
    >
      <TextHeadline style={{ marginBottom: 12 }}>{t("mood")}</TextHeadline>
      <Scale value={value} onPress={onChange} type={scaleType} />
    </View>
  );
};
