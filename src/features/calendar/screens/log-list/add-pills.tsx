import { Pressable, View } from "react-native";
import { ModuleIcon } from "@/components/module-icon";
import { Label } from "@/components/typography";
import type { LoggerStep } from "@/constants/logger-steps";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { INSET } from "./layout";

/** Steps the day view can add to, in card order, with label. */
const ADDABLE_STEPS = [
  { step: "emotions", label: "logger_step_emotions" },
  { step: "people", label: "logger_step_people" },
  { step: "tags", label: "logger_step_tags" },
  { step: "photos", label: "logger_step_photos" },
  { step: "message", label: "logger_step_message" },
] as const;

/** A step the add pills can offer. */
export type AddableStep = (typeof ADDABLE_STEPS)[number]["step"];

/**
 * Dashed pills, logger tag size, for empty steps at the end of an entry card, one per step in
 * `steps`. A tap opens the logger at that step. Renders nothing when
 * `steps` is empty.
 */
export const AddPills = ({
  steps,
  onAdd,
}: {
  steps: AddableStep[];
  onAdd: (step: LoggerStep) => void;
}) => {
  const colors = useColors();
  const pills = ADDABLE_STEPS.filter(({ step }) => steps.includes(step));

  if (pills.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingHorizontal: INSET,
      }}
    >
      {pills.map(({ step, label }) => (
        <Pressable
          key={step}
          testID={`log-list-${step}-edit`}
          accessibilityRole="button"
          accessibilityLabel={t("view_log_add", { module: t(label) })}
          onPress={() => onAdd(step)}
          hitSlop={7}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: RADIUS.full,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.logCardBorder,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ModuleIcon module={step} size={17} color={colors.textSecondary} />
          <Label size={16} style={{ color: colors.textSecondary }}>
            {t(label)}
          </Label>
        </Pressable>
      ))}
    </View>
  );
};
