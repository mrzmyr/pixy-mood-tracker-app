import { Pressable, View } from "react-native";
import ThumbsDown from "lucide-react-native/icons/thumbs-down";
import ThumbsUp from "lucide-react-native/icons/thumbs-up";
import { t } from "@/lib/translation";
import { StoryText } from "./parts";
import { STORY_PALETTE } from "./theme";
import type { StoryTheme } from "./theme";

const Answer = ({
  label,
  icon,
  onPress,
  theme,
  testID,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  theme: StoryTheme;
  testID: string;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    testID={testID}
    style={({ pressed }) => ({
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 8,
      opacity: pressed ? 0.6 : 1,
    })}
  >
    {icon}
    <StoryText kind="label" theme={theme} tone="muted" numberOfLines={1}>
      {label}
    </StoryText>
  </Pressable>
);

/**
 * Helpful / Not Helpful for the current slide, same labels as recap cards.
 * After an answer it thanks the user and offers nothing else.
 */
export const StoryFeedback = ({
  theme,
  isAnswered,
  onHelpful,
  onNotHelpful,
}: {
  theme: StoryTheme;
  isAnswered: boolean;
  onHelpful: () => void;
  onNotHelpful: () => void;
}) => {
  const color = STORY_PALETTE[theme].muted;
  if (isAnswered) {
    return (
      <View
        style={{
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 8,
        }}
      >
        <StoryText
          kind="label"
          theme={theme}
          tone="muted"
          testID="recap-story-feedback-thanks"
        >
          {t("recaps_feedback_thanks")}
        </StoryText>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Answer
        label={t("recaps_feedback_helpful")}
        icon={<ThumbsUp width={16} height={16} color={color} />}
        onPress={onHelpful}
        theme={theme}
        testID="recap-story-feedback-helpful"
      />
      <View
        style={{ width: 1, height: 16, backgroundColor: color, opacity: 0.4 }}
      />
      <Answer
        label={t("recaps_feedback_not_helpful")}
        icon={<ThumbsDown width={16} height={16} color={color} />}
        onPress={onNotHelpful}
        theme={theme}
        testID="recap-story-feedback-not-helpful"
      />
    </View>
  );
};
