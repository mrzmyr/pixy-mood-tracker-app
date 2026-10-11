import { Pressable, Text, View } from "react-native";
import { ThumbsDown, ThumbsUp } from "react-native-feather";
import { Secondary } from "@/components/Type";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/** Answer to a card, `null` before the user answers. */
export type CardFeedback = "helpful" | "not_helpful" | null;

const FooterButton = ({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  testID: string;
}) => {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {icon}
      <Text style={{ fontSize: 15, color: colors.textSecondary }}>{label}</Text>
    </Pressable>
  );
};

/**
 * Helpful / Not Helpful below a card. After an answer it thanks the user
 * and offers nothing else.
 */
export const FeedbackFooter = ({
  feedback,
  onHelpful,
  onNotHelpful,
  testID,
}: {
  feedback: CardFeedback;
  onHelpful: () => void;
  onNotHelpful: () => void;
  testID: string;
}) => {
  const colors = useColors();
  const iconProps = { width: 16, height: 16, color: colors.textSecondary };

  if (feedback !== null) {
    return (
      <Secondary testID={`${testID}-thanks`} style={{ padding: 8 }}>
        {t("recaps_feedback_thanks")}
      </Secondary>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: 20, paddingHorizontal: 8 }}>
      <FooterButton
        label={t("recaps_feedback_helpful")}
        icon={<ThumbsUp {...iconProps} />}
        onPress={onHelpful}
        testID={`${testID}-helpful`}
      />
      <FooterButton
        label={t("recaps_feedback_not_helpful")}
        icon={<ThumbsDown {...iconProps} />}
        onPress={onNotHelpful}
        testID={`${testID}-not-helpful`}
      />
    </View>
  );
};
