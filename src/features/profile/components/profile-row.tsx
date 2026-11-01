import { Icon, ListItem, RNHostView, Text } from "@expo/ui";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Platform } from "react-native";
import { getTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useProfile } from "../use-profile";
import { ProfileAvatar } from "./profile-avatar";

const AVATAR_SIZE = 56;
const AFFORDANCE_SIZE = 13;
type NativeTextStyle = NonNullable<ComponentProps<typeof Text>["textStyle"]>;

/** Geist styles for `@expo/ui` text. */
// SAFETY: `getTextStyle` sets only fontSize, lineHeight, and fontWeight "600", all valid `@expo/ui` text style values.
const SUBTITLE_TEXT = getTextStyle("label", 14) as NativeTextStyle;
// SAFETY: same as above.
const NAME_TEXT = getTextStyle("heading", 20) as NativeTextStyle;

/**
 * First row of Settings, like the account row of iOS Settings. Native row in
 * its own `FieldGroup.Section`, so corner radius, insets, and press state match
 * the other rows. Must render inside an `@expo/ui` `Host`. Empty: gray
 * silhouette and "Add Your Name", the only hint that a profile exists. Set:
 * photo or initials, name, and the year of the first entry. Year only, so
 * the line fits next to the avatar.
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
          date: profile.loggingSince.format("YYYY"),
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
      supportingText={
        subtitle ? (
          <Text
            numberOfLines={1}
            textStyle={{
              ...SUBTITLE_TEXT,
              color: colors.textSecondary,
            }}
          >
            {subtitle}
          </Text>
        ) : undefined
      }
    >
      <Text
        numberOfLines={1}
        textStyle={{
          ...NAME_TEXT,
          fontWeight: profile.name ? "600" : "500",
          color: colors.menuListItemText,
        }}
      >
        {profile.name || t("profile_add_name")}
      </Text>
    </ListItem>
  );
};
