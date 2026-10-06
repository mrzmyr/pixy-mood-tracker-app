import dayjs from "dayjs";
import { Redirect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { Check, Cloud, RotateCcw } from "react-native-feather";
import { GoogleDriveLogo } from "@/components/GoogleDriveLogo";
import LinkButton from "@/components/LinkButton";
import { MarkdownBody } from "@/components/MarkdownBody";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { useBackup } from "@/features/backup";
import type { BackupValue } from "@/features/backup";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/featureFlags";

/** iOS system blue, the color of the iCloud symbol in iOS Settings. */
const ICLOUD_BLUE = "#007AFF";
const SUCCESS_GREEN = "#34C759";
/** "2 minutes ago" stays correct while the screen is open. */
const RELATIVE_TIME_REFRESH_MS = 30_000;

const ProviderIcon = ({ provider }: { provider: BackupValue["provider"] }) =>
  provider === "icloud" ? (
    <SymbolView
      name="icloud.fill"
      size={22}
      tintColor={ICLOUD_BLUE}
      fallback={<Cloud width={18} color={ICLOUD_BLUE} />}
    />
  ) : (
    <GoogleDriveLogo size={20} />
  );

/** Re-renders on an interval, so relative times stay current. */
const useNow = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};

/** Problem sentence that says how to fix it, or `null` when backup works. */
const getProblemText = ({
  provider,
  status,
}: Pick<BackupValue, "provider" | "status">): string | null => {
  const problems: Partial<Record<BackupValue["status"], string>> = {
    unavailable:
      provider === "icloud"
        ? t("backup_unavailable_ios")
        : t("backup_unavailable_android"),
    signedOut: t("backup_signed_out"),
    incompatible: t("backup_incompatible"),
    error: t("backup_failed"),
  };
  return problems[status] ?? null;
};

/** "Syncing…", "2 minutes ago", or "Not yet". */
const getLastSyncText = ({
  status,
  lastBackupAt,
  now,
}: Pick<BackupValue, "status" | "lastBackupAt"> & { now: number }) => {
  if (status === "syncing") {
    return t("backup_syncing");
  }
  if (!lastBackupAt) {
    return t("backup_last_sync_never");
  }
  const backupTime = dayjs(lastBackupAt);
  // The clock ticks every 30 s, so a fresh backup can be newer than `now`.
  return backupTime.from(Math.max(now, backupTime.valueOf()));
};

/**
 * Settings > Data > Backup: switch for the iCloud (iOS) or Google Drive
 * (Android) backup, last sync, restore while auto-backup is paused, and
 * notes on privacy. State and actions come from `BackupProvider`. Without
 * the `backup` feature flag, a deep link lands on Settings > Data.
 */
export const BackupScreen = () => {
  const colors = useColors();
  const backup = useBackup();
  const { provider, enabled, status, lastBackupAt, canRestore } = backup;
  const now = useNow(RELATIVE_TIME_REFRESH_MS);
  const problem = enabled ? getProblemText({ provider, status }) : null;
  const showLastSync = enabled && problem === null;
  const showRestore = enabled && canRestore;
  const isSynced = status === "idle" && lastBackupAt !== null;
  const isFeatureOn = useFeatureFlag("backup");

  if (!isFeatureOn) {
    return <Redirect href="/settings/data" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ padding: 20 }}>
        <MenuList style={{ marginTop: 16 }}>
          <MenuListItem
            title={
              provider === "icloud"
                ? t("backup_toggle_ios")
                : t("backup_toggle_android")
            }
            iconLeft={<ProviderIcon provider={provider} />}
            iconRight={
              <Switch
                ios_backgroundColor={colors.backgroundSecondary}
                onValueChange={(value) => backup.setEnabled(value)}
                value={enabled}
                testID="backup-enabled"
              />
            }
          />
          {showLastSync && (
            <MenuListItem
              title={t("backup_last_sync")}
              value={getLastSyncText({ status, lastBackupAt, now })}
              iconRight={
                isSynced ? <Check width={18} color={SUCCESS_GREEN} /> : null
              }
              testID="backup-last-sync"
            />
          )}
          {showRestore && (
            <MenuListItem
              title={`${t("backup_restore")}…`}
              iconLeft={
                <RotateCcw width={18} color={colors.menuListItemIcon} />
              }
              onPress={() => backup.restore()}
              testID="backup-restore"
            />
          )}
        </MenuList>
        {problem !== null && (
          <TextInfo style={{ marginTop: 8 }}>{problem}</TextInfo>
        )}
        {showRestore && (
          <TextInfo style={{ marginTop: 8 }}>
            {t("backup_paused_other_phone")}
          </TextInfo>
        )}
        {enabled && status === "signedOut" && (
          <LinkButton
            onPress={() => backup.reconnect()}
            testID="backup-sign-in"
            style={{ alignSelf: "flex-start", marginLeft: 8 }}
          >
            {t("backup_sign_in")}
          </LinkButton>
        )}

        <MenuListHeadline>{t("backup_good_to_know")}</MenuListHeadline>
        <View style={{ paddingHorizontal: 12, paddingBottom: 80 }}>
          <MarkdownBody subtle>
            {provider === "icloud"
              ? t("backup_privacy_ios")
              : t("backup_privacy_android")}
          </MarkdownBody>
        </View>
      </ScrollView>
    </View>
  );
};
