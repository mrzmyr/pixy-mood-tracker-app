import { FileText, Heart, Image, Tag, Users } from "react-native-feather";
import { Pressable, Text, View } from "react-native";
import type { LoggerStep } from "@/constants/LoggerSteps";
import { COMPACT_CHIP } from "@/constants/Chip";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { INSET } from "./layout";

/** Steps the day view can add to, in card order, with label and icon. */
const ADDABLE_STEPS = [
  { step: "emotions", label: "logger_step_emotions", Icon: Heart },
  { step: "people", label: "logger_step_people", Icon: Users },
  { step: "tags", label: "logger_step_tags", Icon: Tag },
  { step: "photos", label: "logger_step_photos", Icon: Image },
  { step: "message", label: "logger_step_message", Icon: FileText },
] as const;

/** A step the add pills can offer. */
export type AddableStep = (typeof ADDABLE_STEPS)[number]["step"];

/**
 * Dashed pills for empty steps at the end of an entry card, one per step in
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
      {pills.map(({ step, label, Icon }) => (
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
            gap: COMPACT_CHIP.gap,
            height: COMPACT_CHIP.height,
            paddingHorizontal: COMPACT_CHIP.paddingHorizontal,
            borderRadius: COMPACT_CHIP.borderRadius,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: colors.logCardBorder,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon width={15} height={15} color={colors.textSecondary} />
          <Text
            style={{
              fontSize: COMPACT_CHIP.fontSize,
              color: colors.textSecondary,
            }}
          >
            {t(label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};
