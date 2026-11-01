import Check from "lucide-react-native/icons/check";
import { Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { INTERVENTIONS } from "../catalog";
import type { InterventionId } from "../catalog";
import { Duration } from "./duration";
import { Copy, Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import { SHADOW } from "@/constants/shadow";

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
          borderCurve: "continuous",
          padding: 14,
          minHeight: 104,
          justifyContent: "space-between",
          gap: 10,
          opacity: pressed ? 0.8 : 1,
          boxShadow: SHADOW.tile,
        },
        style,
      ]}
    >
      <View style={{ gap: 3 }}>
        <View
          style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}
        >
          <Label
            size={16}
            strong
            style={{
              flex: 1,
              lineHeight: 20,
              color: colors.text,
            }}
          >
            {title}
          </Label>
          {isDone && <Check size={16} color={colors.tint} strokeWidth={2.5} />}
        </View>
        <Copy size={13} style={{ lineHeight: 17, color: colors.textSecondary }}>
          {t(`interventions_${id}_short`)}
        </Copy>
      </View>
      {isDone ? (
        <Label size={13} style={{ color: colors.tint, fontWeight: "500" }}>
          {t("interventions_done_today")}
        </Label>
      ) : (
        <Duration length={intervention.length} minutes={intervention.minutes} />
      )}
    </Pressable>
  );
};
