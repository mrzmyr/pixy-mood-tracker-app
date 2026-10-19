import { isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Platform, Pressable } from "react-native";
import { ScrollToTopGuard } from "react-native-screens/experimental";
import { t } from "@/lib/translation";
import { useProfile } from "../use-profile";
import { ProfileAvatar } from "./profile-avatar";

// iOS 26+: header buttons sit in 44 pt Liquid Glass circles. Older iOS and
// Android have plain header icons, so a 44 pt photo would fill the bar.
const HAS_GLASS = Platform.OS === "ios" && isGlassEffectAPIAvailable();

/** Silhouette size inside the system glass circle. */
const PROFILE_HEADER_GLYPH_SIZE = 32;
/**
 * Photo or initials size: fills the 44 pt circle of the glass buttons.
 * Without glass, matches the silhouette so it fits the header bar.
 */
const PROFILE_HEADER_AVATAR_SIZE = HAS_GLASS ? 44 : PROFILE_HEADER_GLYPH_SIZE;

/** Whether the header avatar shows a photo or initials, not the silhouette. */
export const useHasProfileAvatar = () => {
  const profile = useProfile();
  return profile.photoUri !== null || profile.initials !== "";
};

/**
 * Calendar header button that opens Settings. Shows the user's avatar
 * instead of the cog: a photo or initials fill the circle, the silhouette
 * sits inside the system glass. Keeps the "Settings" label, so screen readers and
 * e2e flows find it like before.
 */
export const ProfileHeaderButton = ({ onPress }: { onPress: () => void }) => {
  const profile = useProfile();
  const hasAvatar = profile.photoUri !== null || profile.initials !== "";
  const size = hasAvatar
    ? PROFILE_HEADER_AVATAR_SIZE
    : PROFILE_HEADER_GLYPH_SIZE;

  return (
    // iOS 27 (iPadOS 26) scrolls the screen to the top on header taps.
    // Pressable does not consume the tap, so the calendar jumped to its
    // oldest month. Remove once react-native fixes it:
    // https://github.com/react/react-native/issues/56061
    <ScrollToTopGuard>
      <Pressable
        testID="calendar-settings"
        accessibilityRole="button"
        accessibilityLabel={t("settings")}
        onPress={onPress}
        hitSlop={6}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <ProfileAvatar
          size={size}
          photoUri={profile.photoUri}
          initials={profile.initials}
        />
      </Pressable>
    </ScrollToTopGuard>
  );
};
