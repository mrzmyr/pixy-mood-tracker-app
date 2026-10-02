import { useEffect } from "react";
import { applyBackupEnabled } from "@/lib/backup";
import { useSettings } from "@/state/settings";

/**
 * Applies the stored backup switch after settings load and on every change.
 *
 * iOS needs this on every launch: AsyncStorage resets the backup flag of its
 * folder when it loads, which happens before settings finish loading.
 */
export const useBackupSetting = () => {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.loaded) {
      applyBackupEnabled(settings.backupEnabled);
    }
  }, [settings.loaded, settings.backupEnabled]);
};
