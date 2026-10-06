import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Lock } from "react-native-feather";
import FlagHighlight from "@/components/FlagHighlight";
import MenuListItem from "@/components/MenuListItem";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/featureFlags";
import { useAppLock } from "./AppLockProvider";

/**
 * Settings row that opens Settings > App Lock and shows On or Off. Needs the
 * `app-lock` flag, and stays while the lock is on, so the user can turn it
 * off without the flag.
 */
export const AppLockMenuItem = () => {
  const router = useRouter();
  const colors = useColors();
  const { isEnabled } = useAppLock();
  const hasFlag = useFeatureFlag("app-lock");

  if (!hasFlag && !isEnabled) {
    return null;
  }

  const status = t(isEnabled ? "step_status_on" : "step_status_off");

  return (
    <FlagHighlight flag="app-lock">
      <MenuListItem
        title={
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{ flex: 1, fontSize: 17, color: colors.text }}
              numberOfLines={1}
            >
              {t("app_lock")}
            </Text>
            <Text
              style={{
                fontSize: 17,
                color: colors.textSecondary,
                marginRight: 8,
              }}
            >
              {status}
            </Text>
          </View>
        }
        iconLeft={<Lock width={18} color={colors.menuListItemIcon} />}
        accessibilityValue={{ text: status }}
        onPress={() => router.push("/settings/app-lock")}
        testID="app-lock"
        isLink
      />
    </FlagHighlight>
  );
};
