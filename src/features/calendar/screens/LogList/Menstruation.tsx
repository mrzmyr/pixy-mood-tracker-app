import { Pressable, Text } from "react-native";
import { MenstruationIcon } from "@/components/MenstruationIcon";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import usePressRipple from "@/hooks/usePressRipple";
import { t } from "@/lib/translation";

/** Compact header flow stays visible when the flag is off. Accessible label names the module. */
export const Menstruation = ({
  item,
  onEdit,
}: {
  item: LogItem;
  onEdit?: () => void;
}) => {
  const colors = useColors();
  const ripple = usePressRipple();
  const flow = item.menstruation?.flow;
  if (flow === undefined) {
    return null;
  }
  const label = `${t("logger_step_menstruation")}: ${t(`menstruation_flow_${flow}`)}`;
  return (
    <Pressable
      testID="log-list-menstruation"
      disabled={!onEdit}
      onPress={onEdit}
      accessibilityRole={onEdit ? "button" : "text"}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onEdit }}
      accessibilityHint={
        onEdit
          ? t("view_log_edit", { module: t("logger_step_menstruation") })
          : undefined
      }
      android_ripple={onEdit ? ripple : undefined}
      hitSlop={{ top: 14, bottom: 14 }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        gap: 5,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <MenstruationIcon flow={flow} color={colors.textSecondary} />
      <Text
        style={{ flexShrink: 1, fontSize: 13, color: colors.textSecondary }}
      >
        {t(`menstruation_flow_${flow}`)}
      </Text>
    </Pressable>
  );
};
