import { Icon } from "@expo/ui";
import { useRouter } from "expo-router";
import FieldRow from "@/components/FieldRow";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/featureFlags";
import { useAppLock } from "./AppLockProvider";

const LOCK_ICON = Icon.select({
  ios: "lock",
  android: import("@expo/material-symbols/lock.xml"),
});

/**
 * Whether Settings shows the App Lock row. Needs the `app-lock` flag, and
 * stays while the lock is on, so the user can turn it off without the flag.
 */
export const useIsAppLockMenuItemVisible = () => {
  const { isEnabled } = useAppLock();
  const hasFlag = useFeatureFlag("app-lock");
  return hasFlag || isEnabled;
};

/**
 * Settings row that opens Settings > App Lock and shows On or Off. Renders
 * inside the Settings `FieldGroup`; gate it with
 * `useIsAppLockMenuItemVisible`.
 */
export const AppLockMenuItem = () => {
  const router = useRouter();
  const { isEnabled } = useAppLock();
  const isVisible = useIsAppLockMenuItemVisible();

  if (!isVisible) {
    return null;
  }

  return (
    <FieldRow
      title={t("app_lock")}
      icon={LOCK_ICON}
      kind="push"
      value={t(isEnabled ? "step_status_on" : "step_status_off")}
      onPress={() => router.push("/settings/app-lock")}
      testID="app-lock"
    />
  );
};
