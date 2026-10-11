import { Pressable, Text } from "react-native";
import { MenstruationIcon } from "@/components/MenstruationIcon";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import usePressRipple from "@/hooks/usePressRipple";
import { t } from "@/lib/translation";
import { INSET } from "./layout";

/** Stored daily flow remains visible when the feature flag is off. */
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
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: INSET,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <MenstruationIcon flow={flow} />
      <Text style={{ flex: 1, fontSize: 17, color: colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
};
