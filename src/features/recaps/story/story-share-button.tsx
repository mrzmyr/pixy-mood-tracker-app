import ShareIcon from "lucide-react-native/icons/share";
import { Pressable } from "react-native";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { StoryText } from "./parts";
import type { StoryTheme } from "./theme";

/**
 * Share pill under every story slide. Inverted against the slide: black on
 * `paper`, white on `night` and photos.
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
  const isPaper = theme === "paper";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      testID="recap-story-share"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 18,
        borderRadius: RADIUS.full,
        backgroundColor: isPaper ? "#0A0A0A" : "#FFFFFF",
        opacity: pressed || disabled ? 0.7 : 1,
      })}
    >
      <ShareIcon
        width={16}
        height={16}
        color={isPaper ? "#FFFFFF" : "#0A0A0A"}
      />
      <StoryText
        kind="label"
        theme={isPaper ? "night" : "paper"}
        style={{ fontSize: 15 }}
      >
        {t("recaps_story_share")}
      </StoryText>
    </Pressable>
  );
};
