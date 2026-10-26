import { Pressable } from "react-native";
import { ScrollToTopGuard } from "react-native-screens/experimental";
import { t } from "@/lib/translation";
import { useProfile } from "../use-profile";
import { ProfileAvatar } from "./profile-avatar";

/**
 * Avatar size in the header. iOS 26+ puts it in a 44 pt Liquid Glass
 * circle, so a 6 pt glass ring stays visible around it. Older iOS and
 * Android have plain header icons, where 32 pt fits the bar.
 */
const PROFILE_HEADER_AVATAR_SIZE = 32;

/**
 * Calendar header button that opens Settings. Shows the user's avatar
 * instead of the cog: photo, initials, or silhouette, inset in the system
 * glass circle. Keeps the "Settings" label, so screen readers and
 * e2e flows find it like before.
 */
export const ProfileHeaderButton = ({ onPress }: { onPress: () => void }) => {
  const profile = useProfile();

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
          size={PROFILE_HEADER_AVATAR_SIZE}
          photoUri={profile.photoUri}
          initials={profile.initials}
        />
      </Pressable>
    </ScrollToTopGuard>
  );
};
