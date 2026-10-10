import { Check } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { INTERVENTIONS } from "../catalog";
import type { InterventionId } from "../catalog";
import { Duration } from "./Duration";
import { RADIUS } from "@/constants/Radius";

/** Tappable intervention: title, one-line purpose, length or done state. */
export const OptionTile = ({
  id,
  isDone = false,
  backgroundColor,
  style,
  onPress,
}: {
  id: InterventionId;
  isDone?: boolean;
  backgroundColor: string;
  style?: ViewStyle;
  onPress: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const intervention = INTERVENTIONS[id];
  const title = t(`interventions_${id}_title`);
  const minutes = t("interventions_minutes", { count: intervention.minutes });

  return (
    <Pressable
      testID={`intervention-option-${id}`}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${isDone ? t("interventions_done_today") : minutes}`}
      onPress={() => {
        void haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor,
          borderRadius: RADIUS.md,
          padding: 14,
          minHeight: 104,
          justifyContent: "space-between",
          gap: 10,
          opacity: pressed ? 0.8 : 1,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
        style,
      ]}
    >
      <View style={{ gap: 3 }}>
        <View
          style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 20,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            {title}
          </Text>
          {isDone && <Check size={16} color={colors.tint} strokeWidth={2.5} />}
        </View>
        <Text
          style={{ fontSize: 13, lineHeight: 17, color: colors.textSecondary }}
        >
          {t(`interventions_${id}_short`)}
        </Text>
      </View>
      {isDone ? (
        <Text style={{ fontSize: 13, color: colors.tint, fontWeight: "500" }}>
          {t("interventions_done_today")}
        </Text>
      ) : (
        <Duration length={intervention.length} minutes={intervention.minutes} />
      )}
    </Pressable>
  );
};
