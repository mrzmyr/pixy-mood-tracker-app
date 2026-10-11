import { FileText, Heart, Image, Tag, Users } from "react-native-feather";
import { Pressable, Text, View } from "react-native";
import type { LoggerStep } from "@/constants/LoggerSteps";
import { RADIUS } from "@/constants/Radius";
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
          <Icon width={17} height={17} color={colors.textSecondary} />
          <Text
            style={{
              fontSize: 17,
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
