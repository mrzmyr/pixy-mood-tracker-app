import { Pressable } from "react-native";
import { MenstruationIcon } from "@/components/menstruation-icon";
import { Label } from "@/components/typography";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import usePressRipple from "@/hooks/use-press-ripple";
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
      <Label size={13} style={{ flexShrink: 1, color: colors.textSecondary }}>
        {t(`menstruation_flow_${flow}`)}
      </Label>
    </Pressable>
  );
};
