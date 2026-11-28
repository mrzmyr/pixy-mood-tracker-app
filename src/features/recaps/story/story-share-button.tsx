import { ShareIcon } from "@/components/icons";
import { Pressable } from "react-native";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { StoryText } from "./parts";
import { STORY_PALETTE, storyButtonTint } from "./theme";
import type { StoryTheme } from "./theme";

/**
 * Share pill under every story slide. Secondary: a light tint of the slide
 * color, so it sits next to Helpful / Not Helpful instead of shouting.
 * `prominent`: full-width filled button for the last slide, whose card is
 * made to be shared.
 */
export const StoryShareButton = ({
  theme,
  disabled,
  prominent = false,
  onPress,
}: {
  theme: StoryTheme;
  disabled: boolean;
  prominent?: boolean;
  onPress: () => void;
}) => {
  const palette = STORY_PALETTE[theme];
  // Prominent: filled with the text color, label in the slide color.
  const ink = prominent ? palette.background : palette.text;
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
        minHeight: prominent ? 52 : 44,
        paddingHorizontal: 16,
        alignSelf: prominent ? "stretch" : "auto",
        flexGrow: prominent ? 1 : 0,
        borderRadius: RADIUS.full,
        backgroundColor: prominent ? palette.text : storyButtonTint(theme),
        opacity: pressed || disabled ? 0.6 : 1,
      })}
    >
      <ShareIcon
        width={prominent ? 18 : 16}
        height={prominent ? 18 : 16}
        color={ink}
      />
      <StoryText
        kind="label"
        theme={theme}
        style={{
          fontSize: prominent ? 17 : 15,
          fontWeight: prominent ? "600" : undefined,
          color: ink,
        }}
      >
        {t("recaps_story_share")}
      </StoryText>
    </Pressable>
  );
};
