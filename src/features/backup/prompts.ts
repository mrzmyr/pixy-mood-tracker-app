import noop from "lodash/noop";
import Alert from "@/lib/alert";
import { askToConfirm } from "@/lib/prompts";
import { t } from "@/lib/translation";
import type { BackupProvider } from "./providers";

/**
 * Ask before replacing local data with the cloud backup. The message names
 * both entry counts and the backup age, so losing newer local entries is a
 * conscious choice.
 */
export const askToRestoreBackup = ({
  localCount,
  backupCount,
  backupAge,
}: {
  localCount: number;
  backupCount: number;
  /** Relative time of the backup, for example "2 days ago". */
  backupAge: string;
}) =>
  askToConfirm({
    title: t("backup_restore_confirm_title"),
    message: t("backup_restore_confirm_message", {
      localCount,
      backupCount,
      backupAge,
    }),
    confirmText: t("backup_restore_confirm_ok"),
    cancelText: t("cancel"),
  });

/** Ask before turning backup off, which deletes the cloud backup. */
export const askToTurnOffBackup = () =>
  askToConfirm({
    title: t("backup_off_confirm_title"),
    message: t("backup_off_confirm_message"),
    confirmText: t("backup_off_confirm_ok"),
    cancelText: t("cancel"),
  });

/**
 * Show that backup is off but the cloud copy may remain, with the steps to
 * delete it in iCloud or Google Drive.
 */
export const showBackupNotDeleted = (provider: BackupProvider) => {
  Alert.alert(
    t("backup_off_not_deleted_title"),
    provider === "icloud"
      ? t("backup_off_not_deleted_icloud")
      : t("backup_off_not_deleted_google_drive"),
    [{ text: t("ok"), onPress: noop }],
    { cancelable: false }
  );
};
