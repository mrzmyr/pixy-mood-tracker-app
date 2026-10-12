import { Pressable, View } from "react-native";
import { ThumbsDown, ThumbsUp } from "react-native-feather";
import { Secondary } from "@/components/Type";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { CARD_PADDING } from "./rowLayout";

/** Answer to a card, `null` before the user answers. */
export type CardFeedback = "helpful" | "not_helpful" | null;

/** Row height: the touch target of both answers, no padding around. */
const ROW_HEIGHT = 44;
/** Button side padding. The row pulls in by it, so icons line up with the card text. */
const BUTTON_INSET = 12;

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
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    testID={testID}
    style={({ pressed }) => ({
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: ROW_HEIGHT,
      paddingHorizontal: BUTTON_INSET,
      opacity: pressed ? 0.6 : 1,
    })}
  >
    {icon}
    <Secondary>{label}</Secondary>
  </Pressable>
);

/**
 * Helpful / Not Helpful in the card footer: muted text, a hairline between.
 * After an answer it thanks the user at the same height and offers nothing
 * else.
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
      <View
        style={{
          minHeight: ROW_HEIGHT,
          justifyContent: "center",
          paddingHorizontal: CARD_PADDING,
        }}
      >
        <Secondary testID={`${testID}-thanks`}>
          {t("recaps_feedback_thanks")}
        </Secondary>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        paddingHorizontal: CARD_PADDING - BUTTON_INSET,
      }}
    >
      <FooterButton
        label={t("recaps_feedback_helpful")}
        icon={<ThumbsUp {...iconProps} />}
        onPress={onHelpful}
        testID={`${testID}-helpful`}
      />
      <View
        style={{
          width: 1,
          height: 16,
          backgroundColor: colors.recapCardBorder,
        }}
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
