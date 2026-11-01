import ShareIcon from "lucide-react-native/icons/share";
import { Pressable } from "react-native";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { StoryText } from "./parts";
import { STORY_PALETTE, storyButtonTint } from "./theme";
import type { StoryTheme } from "./theme";

/**
 * Share pill under every story slide. Secondary: a light tint of the slide
 * color, so it sits next to Helpful / Not Helpful instead of shouting.
 */
export const StoryShareButton = ({
  theme,
  disabled,
  onPress,
}: {
  theme: StoryTheme;
  disabled: boolean;
  onPress: () => void;
}) => {
  const ink = STORY_PALETTE[theme].text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      testID="recap-story-share"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: RADIUS.full,
        backgroundColor: storyButtonTint(theme),
        opacity: pressed || disabled ? 0.6 : 1,
      })}
    >
      <ShareIcon width={16} height={16} color={ink} />
      <StoryText
        kind="label"
        theme={theme}
        style={{ fontSize: 15, color: ink }}
      >
        {t("recaps_story_share")}
      </StoryText>
    </Pressable>
  );
};
