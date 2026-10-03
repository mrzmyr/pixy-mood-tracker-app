import dayjs from "dayjs";
import { SymbolView } from "expo-symbols";
import { ScrollView, Switch, View } from "react-native";
import { CheckCircle, Cloud, RotateCcw } from "react-native-feather";
import { MarkdownBody } from "@/components/MarkdownBody";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { useBackup } from "@/features/backup";
import type { BackupValue } from "@/features/backup";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/** iOS system blue, the color of the iCloud symbol in iOS Settings. */
const ICLOUD_BLUE = "#007AFF";
const SUCCESS_GREEN = "#34C759";

const ProviderIcon = ({
  provider,
  color,
}: {
  provider: BackupValue["provider"];
  color: string;
}) =>
  provider === "icloud" ? (
    <SymbolView
      name="icloud.fill"
      size={22}
      tintColor={ICLOUD_BLUE}
      fallback={<Cloud width={18} color={ICLOUD_BLUE} />}
    />
  ) : (
    <Cloud width={18} color={color} />
  );

/** Text for the "Last sync" row. */
const getLastSyncText = ({
  provider,
  status,
  lastBackupAt,
}: Pick<BackupValue, "provider" | "status" | "lastBackupAt">): string => {
  const statusText: Partial<Record<BackupValue["status"], string>> = {
    syncing: t("backup_syncing"),
    unavailable:
      provider === "icloud"
        ? t("backup_unavailable_ios")
        : t("backup_unavailable_android"),
    signedOut: t("backup_signed_out"),
    error: t("backup_failed"),
  };
  if (statusText[status]) {
    return statusText[status];
  }
  return lastBackupAt
    ? dayjs(lastBackupAt).format("lll")
    : t("backup_last_sync_never");
};

/**
 * Settings > Data > Backup: switch for the iCloud (iOS) or Google Drive
 * (Android) backup, last sync, restore, and what the backup means for
 * privacy. State and actions come from `BackupProvider`.
 */
export const BackupScreen = () => {
  const colors = useColors();
  const backup = useBackup();
  const { provider, enabled, status, lastBackupAt, hasBackup } = backup;
  const isSynced = status === "idle" && lastBackupAt !== null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView style={{ padding: 20 }}>
        <MenuList style={{ marginTop: 16 }}>
          <MenuListItem
            title={
              provider === "icloud"
                ? t("backup_toggle_ios")
                : t("backup_toggle_android")
            }
            iconLeft={
              <ProviderIcon
                provider={provider}
                color={colors.menuListItemIcon}
              />
            }
            iconRight={
              <Switch
                ios_backgroundColor={colors.backgroundSecondary}
                onValueChange={(value) => backup.setEnabled(value)}
                value={enabled}
                testID="backup-enabled"
              />
            }
            isLast={!enabled}
          />
          {enabled && (
            <MenuListItem
              title={t("backup_last_sync")}
              value={getLastSyncText({ provider, status, lastBackupAt })}
              iconRight={
                isSynced ? (
                  <CheckCircle width={18} color={SUCCESS_GREEN} />
                ) : null
              }
              onPress={status === "signedOut" ? () => backup.reconnect() : null}
              testID="backup-last-sync"
              isLast={!hasBackup}
            />
          )}
          {enabled && hasBackup && (
            <MenuListItem
              title={t("backup_restore")}
              iconLeft={
                <RotateCcw width={18} color={colors.menuListItemIcon} />
              }
              onPress={() => backup.restore()}
              testID="backup-restore"
              isLast
            />
          )}
        </MenuList>

        <MenuListHeadline>{t("privacy")}</MenuListHeadline>
        <View style={{ paddingHorizontal: 4, paddingBottom: 80 }}>
          <MarkdownBody>
            {provider === "icloud"
              ? t("backup_privacy_ios")
              : t("backup_privacy_android")}
          </MarkdownBody>
        </View>
      </ScrollView>
    </View>
  );
};
