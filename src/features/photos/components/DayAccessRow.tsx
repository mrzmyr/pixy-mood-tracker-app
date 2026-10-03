import { Images, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

const ROW_HEIGHT = 44;
const MIN_TARGET = 44;

/**
 * Inline row in the photos step that offers photos of the entry's
 * day. Allow shows the system dialog; the close button hides the row for
 * good.
 */
export const DayAccessRow = ({
  dayLabel,
  onAllow,
  onDismiss,
}: {
  /** "today", "yesterday", or a short date. */
  dayLabel: string;
  onAllow: () => void;
  onDismiss: () => void;
}) => {
  const colors = useColors();

  return (
    <View
      testID="photos-day-access"
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: ROW_HEIGHT,
        gap: 12,
      }}
    >
      <Images
        color={colors.text}
        size={20}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        style={{ flex: 1, color: colors.text, fontSize: 15 }}
        numberOfLines={2}
      >
        {t("photos_day_access_label", { day: dayLabel })}
      </Text>
      <Pressable
        testID="photos-day-access-allow"
        onPress={onAllow}
        accessibilityRole="button"
        accessibilityHint={t("photos_day_access_label", { day: dayLabel })}
        // 32 pt pill plus 6 pt above and below: a 44 pt target.
        hitSlop={{ top: 6, bottom: 6 }}
        style={({ pressed }) => ({
          minHeight: 32,
          justifyContent: "center",
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: colors.primaryButtonBackground,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            color: colors.primaryButtonText,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {t("photos_day_access_allow")}
        </Text>
      </Pressable>
      <Pressable
        testID="photos-day-access-dismiss"
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t("photos_day_access_dismiss")}
        style={{
          width: MIN_TARGET,
          height: MIN_TARGET,
          marginRight: -12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X color={colors.textSecondary} size={20} />
      </Pressable>
    </View>
  );
};
