import { useState } from "react";
import { Platform } from "react-native";
import {
  SettingsForm,
  SettingsSection,
  SettingsSwitch,
} from "@/components/settings-form";
import { t } from "@/lib/translation";
import { useAppLock } from "./app-lock-provider";
import type { UnlockMethod } from "./device-auth";

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
 * Settings > App Lock: one native grouped section with the App Lock switch
 * and its help text as footer. Turning the lock on or off needs the OS prompt, so only the
 * device owner changes it. Disabled without a device passcode.
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

  const help = isUnavailable
    ? t("app_lock_unavailable")
    : t("app_lock_help", { method: methodLabel(unlockMethod) });

  return (
    <SettingsForm>
      <SettingsSection
        footer={hasFailed ? `${help}\n\n${t("app_lock_failed")}` : help}
      >
        <SettingsSwitch
          label={t("app_lock")}
          value={isEnabled}
          disabled={isUnavailable && !isEnabled}
          onValueChange={toggle}
          testID="app-lock-enabled"
        />
      </SettingsSection>
    </SettingsForm>
  );
};
