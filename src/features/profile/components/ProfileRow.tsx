import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useProfile } from "../useProfile";
import { ProfileAvatar } from "./ProfileAvatar";

const AVATAR_SIZE = 56;

/**
 * First row of Settings, like the account row of iOS Settings. Empty: gray
 * silhouette and "Add Your Name", the only hint that a profile exists. Set:
 * photo or initials, name, and the month of the first entry.
 */
export const ProfileRow = () => {
  const router = useRouter();
  const colors = useColors();
  const profile = useProfile();
  const hasProfile = profile.name !== "" || profile.photoUri !== null;

  let subtitle: string | null = t("profile_add_name_hint");
  if (hasProfile) {
    subtitle = profile.loggingSince
      ? t("profile_logging_since", {
          date: profile.loggingSince.format("MMMM YYYY"),
        })
      : null;
  }

  return (
    <MenuList>
      <MenuListItem
        testID="settings-profile"
        onPress={() => router.push("/profile")}
        isLink
        iconLeft={
          <ProfileAvatar
            size={AVATAR_SIZE}
            photoUri={profile.photoUri}
            initials={profile.initials}
          />
        }
        title={
          <View style={{ gap: 2 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 20,
                fontWeight: profile.name ? "600" : "500",
                color: colors.menuListItemText,
              }}
            >
              {profile.name || t("profile_add_name")}
            </Text>
            {subtitle && (
              <Text
                numberOfLines={1}
                style={{ fontSize: 14, color: colors.textSecondary }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        }
      />
    </MenuList>
  );
};
