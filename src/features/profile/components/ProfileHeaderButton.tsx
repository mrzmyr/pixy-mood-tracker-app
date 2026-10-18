import { Pressable } from "react-native";
import { t } from "@/lib/translation";
import { useProfile } from "../useProfile";
import { ProfileAvatar } from "./ProfileAvatar";

/** Avatar size inside the header item; the system draws the button around it. */
export const PROFILE_HEADER_AVATAR_SIZE = 32;

/** Whether the header avatar shows a photo or initials, not the silhouette. */
export const useHasProfileAvatar = () => {
  const profile = useProfile();
  return profile.photoUri !== null || profile.initials !== "";
};

/**
 * Calendar header button that opens Settings. Shows the user's avatar
 * instead of the cog. Keeps the "Settings" label, so screen readers and
 * e2e flows find it like before.
 */
export const ProfileHeaderButton = ({
  onPress,
  size = PROFILE_HEADER_AVATAR_SIZE,
}: {
  onPress: () => void;
  size?: number;
}) => {
  const profile = useProfile();

  return (
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
  );
};
