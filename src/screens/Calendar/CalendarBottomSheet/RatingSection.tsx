import { View } from "react-native";
import Scale from "@/components/Scale";
import TextHeadline from "@/components/TextHeadline";
import { t } from "@/helpers/translation";
import type { LogItem } from "../../../hooks/useLogs";
import { useSettings } from "../../../hooks/useSettings";

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
  const { settings } = useSettings();

  return (
    <View
      style={{
        marginBottom: 16,
      }}
    >
      <TextHeadline style={{ marginBottom: 12 }}>{t("mood")}</TextHeadline>
      <Scale value={value} onPress={onChange} type={settings.scaleType} />
    </View>
  );
};
