import { Icon, ListItem, RNHostView, Text } from "@expo/ui";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useProfile } from "../use-profile";
import { ProfileAvatar } from "./profile-avatar";

const AVATAR_SIZE = 56;
const AFFORDANCE_SIZE = 13;

/**
 * First row of Settings, like the account row of iOS Settings. Native row in
 * its own `FieldGroup.Section`, so corner radius, insets, and press state match
 * the other rows. Must render inside an `@expo/ui` `Host`. Empty: gray
 * silhouette and "Add Your Name", the only hint that a profile exists. Set:
 * photo or initials, name, and the month of the first entry.
 */
export const ProfileRow = () => {
  const router = useRouter();
  const colors = useColors();
  const profile = useProfile();
  const hasProfile = profile.name !== "" || profile.photoUri !== null;

  let subtitle: string | undefined = t("profile_add_name_hint");
  if (hasProfile) {
    subtitle = profile.loggingSince
      ? t("profile_logging_since", {
          date: profile.loggingSince.format("MMMM YYYY"),
        })
      : undefined;
  }

  const avatar = (
    <ProfileAvatar
      size={AVATAR_SIZE}
      photoUri={profile.photoUri}
      initials={profile.initials}
    />
  );

  return (
    <ListItem
      testID="settings-profile"
      onPress={() => router.push("/profile")}
      // Android: the section row already paints the container.
      colors={{ containerColor: "transparent" }}
      // iOS wraps React Native accessories itself; Compose does not.
      leading={
        Platform.OS === "android" ? (
          <RNHostView matchContents>{avatar}</RNHostView>
        ) : (
          avatar
        )
      }
      trailing={
        Platform.OS === "ios" ? (
          <Icon
            name="chevron.right"
            size={AFFORDANCE_SIZE}
            color={colors.menuListItemIcon}
          />
        ) : undefined
      }
      supportingText={subtitle}
    >
      <Text
        numberOfLines={1}
        textStyle={{
          fontSize: 20,
          fontWeight: profile.name ? "600" : "500",
          color: colors.menuListItemText,
        }}
      >
        {profile.name || t("profile_add_name")}
      </Text>
    </ListItem>
  );
};
