import { useState } from "react";
import { Platform, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import Toggle from "@/components/Toggle";
import { t } from "@/lib/translation";
import { useAppLock } from "./AppLockProvider";
import type { UnlockMethod } from "./deviceAuth";

const methodLabel = (method: UnlockMethod | null): string => {
  if (method === "face") {
    return "Face ID";
  }
  if (method === "fingerprint") {
    return "Touch ID";
  }
  if (Platform.OS === "android") {
    return t("app_lock_method_android");
  }
  return t("app_lock_method_passcode");
};

/**
 * App Lock switch for Settings > Privacy. Turning it on or off needs the OS
 * prompt, so only the device owner changes it. Disabled without a device
 * passcode.
 */
export const AppLockSetting = () => {
  const { isEnabled, unlockMethod, setEnabled } = useAppLock();
  const [hasFailed, setHasFailed] = useState(false);
  const isUnavailable = unlockMethod === "none";

  const toggle = async (enabled: boolean) => {
    setHasFailed(false);
    const result = await setEnabled(enabled);
    if (result.status === "failed") {
      setHasFailed(true);
      console.warn(result.error);
    }
  };

  return (
    <View>
      <MenuList>
        <MenuListItem
          title={t("app_lock")}
          deactivated={isUnavailable && !isEnabled}
          iconRight={
            <Toggle
              disabled={isUnavailable && !isEnabled}
              onValueChange={toggle}
              value={isEnabled}
              testID="app-lock-enabled"
              accessibilityLabel={t("app_lock")}
            />
          }
        />
      </MenuList>
      <TextInfo>
        {isUnavailable
          ? t("app_lock_unavailable")
          : t("app_lock_help", { method: methodLabel(unlockMethod) })}
      </TextInfo>
      {hasFailed && (
        <TextInfo style={{ marginTop: 0 }}>{t("app_lock_failed")}</TextInfo>
      )}
    </View>
  );
};
