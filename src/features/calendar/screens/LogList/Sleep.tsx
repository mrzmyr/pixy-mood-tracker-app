import type { LogItem } from "@/features/logs";
import { SLEEP_QUALITY_MAPPING } from "@/constants/Ratings";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { Pressable, Text, View } from "react-native";

const METER_HEIGHT = 12;

/**
 * Sleep quality in the entry header: a small gray bar and the word "Sleep".
 * Gray like the time of day next to it, so the mood bar stays the only color. A
 * tap opens the logger at the sleep step when `onEdit` is given. Renders
 * nothing without a sleep rating.
 */
export const Sleep = ({
  item,
  onEdit,
}: {
  item: LogItem;
  onEdit?: () => void;
}) => {
  const colors = useColors();
  const quality = item.sleep?.quality;

  if (!quality) {
    return null;
  }

  // Mapping runs 0 to 4; screen readers read 1 to 5.
  const value = SLEEP_QUALITY_MAPPING[quality];
  const label = `${t("logger_step_sleep")} ${value + 1}/5`;

  return (
    <Pressable
      testID={onEdit ? "log-list-sleep-edit" : undefined}
      disabled={!onEdit}
      onPress={onEdit}
      accessibilityRole={onEdit ? "button" : "text"}
      accessibilityLabel={label}
      accessibilityHint={
        onEdit
          ? t("view_log_edit", { module: t("logger_step_sleep") })
          : undefined
      }
      hitSlop={12}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 6,
          height: METER_HEIGHT,
          borderRadius: RADIUS.full,
          overflow: "hidden",
          justifyContent: "flex-end",
          backgroundColor: colors.logCardBorder,
        }}
      >
        <View
          style={{
            height: (value / 4) * METER_HEIGHT,
            backgroundColor: colors.textSecondary,
          }}
        />
      </View>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
        {t("logger_step_sleep")}
      </Text>
    </Pressable>
  );
};
