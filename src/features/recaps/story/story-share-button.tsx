import ShareIcon from "lucide-react-native/icons/share";
import { Pressable } from "react-native";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { StoryText } from "./parts";
import { STORY_PALETTE } from "./theme";
import type { StoryTheme } from "./theme";

/**
 * Share pill under every story slide. Secondary: a light tint of the slide
 * color, so it sits next to Helpful / Not Helpful instead of shouting. The
 * last slide uses the wide, solid one.
 */
export const StoryShareButton = ({
  theme,
  disabled,
  onPress,
  isWide = false,
}: {
  theme: StoryTheme;
  disabled: boolean;
  onPress: () => void;
  /** Full width and solid, for the last slide where sharing is the point. */
  isWide?: boolean;
}) => {
  const palette = STORY_PALETTE[theme];
  const ink = isWide ? palette.background : palette.text;
  const tint =
    theme === "paper" ? "rgba(10,10,10,0.06)" : "rgba(255,255,255,0.14)";
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
        minHeight: isWide ? 52 : 44,
        paddingHorizontal: 16,
        borderRadius: RADIUS.full,
        alignSelf: isWide ? "stretch" : "auto",
        backgroundColor: isWide ? palette.text : tint,
        opacity: pressed || disabled ? 0.6 : 1,
      })}
    >
      <ShareIcon width={16} height={16} color={ink} />
      <StoryText
        kind="label"
        theme={theme}
        style={{ fontSize: isWide ? 17 : 15, color: ink }}
      >
        {t("recaps_story_share")}
      </StoryText>
    </Pressable>
  );
};
