import dayjs from "dayjs";
import { Redirect } from "expo-router";
import Check from "lucide-react-native/icons/check";
import Cloud from "lucide-react-native/icons/cloud";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import FlagHighlight from "@/components/flag-highlight";
import LinkButton from "@/components/link-button";
import { MarkdownBody } from "@/components/markdown-body";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import { SFIcon } from "@/components/sf-icon";
import TextInfo from "@/components/text-info";
import Toggle from "@/components/toggle";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { t } from "@/lib/translation";
import { useBackup } from "../backup-provider";
import type { BackupValue } from "../backup-provider";
import { GoogleDriveLogo } from "../google-drive-logo";
import { getBackupFlag } from "../providers";
import type { BackupProvider } from "../providers";

/** iOS system blue, the color of the iCloud symbol in iOS Settings. */
const ICLOUD_BLUE = "#007AFF";
const SUCCESS_GREEN = "#34C759";
/** "2 minutes ago" stays correct while the screen is open. */
const RELATIVE_TIME_REFRESH_MS = 30_000;

const ProviderIcon = ({ provider }: { provider: BackupProvider }) =>
  provider === "icloud" ? (
    <SFIcon
      name="icloud.fill"
      color={ICLOUD_BLUE}
      fallback={<Cloud width={18} color={ICLOUD_BLUE} />}
    />
  ) : (
    <GoogleDriveLogo size={20} />
  );

const getProviderTitle = (provider: BackupProvider) =>
  provider === "icloud"
    ? t("backup_toggle_icloud")
    : t("backup_toggle_google_drive");

const getPrivacyText = (provider: BackupProvider) =>
  provider === "icloud"
    ? t("backup_privacy_icloud")
    : t("backup_privacy_google_drive");

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
}: {
  provider: BackupProvider;
  status: BackupValue["status"];
}): string | null => {
  const problems: Partial<Record<BackupValue["status"], string>> = {
    unavailable:
      provider === "icloud"
        ? t("backup_unavailable_icloud")
        : t("backup_unavailable_google_drive"),
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
 * Settings > Data > Backup: one switch per cloud this build offers (iCloud,
 * Google Drive), last sync, restore while auto-backup is paused, and notes
 * on privacy. One cloud at a time: while one is on, the others are
 * disabled. State and actions come from `BackupProvider`. Without a backup
 * feature flag, a deep link lands on Settings > Data.
 */
export const BackupScreen = () => {
  const colors = useColors();
  const backup = useBackup();
  const {
    providers,
    provider,
    enabled,
    status,
    lastBackupAt,
    canRestore,
    restoreReason,
  } = backup;
  const now = useNow(RELATIVE_TIME_REFRESH_MS);
  const paddingBottom = useScrollBottomPadding(80);
  const problem =
    enabled && provider !== null ? getProblemText({ provider, status }) : null;
  const showLastSync = enabled && problem === null;
  const showRestore = enabled && canRestore;
  const isSynced = status === "idle" && lastBackupAt !== null;
  // Privacy notes of the cloud in use, or of every cloud to pick from.
  const notes = enabled && provider !== null ? [provider] : providers;

  if (providers.length === 0) {
    return <Redirect href="/settings/data" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom }}
      >
        <MenuList style={{ marginTop: 16 }}>
          {providers.map((item) => (
            <FlagHighlight key={item} flag={getBackupFlag(item)}>
              <MenuListItem
                title={getProviderTitle(item)}
                iconLeft={<ProviderIcon provider={item} />}
                iconRight={
                  <Toggle
                    accessibilityLabel={getProviderTitle(item)}
                    disabled={enabled && provider !== item}
                    onValueChange={(value) =>
                      value ? backup.turnOn(item) : backup.turnOff()
                    }
                    value={enabled && provider === item}
                    testID={`backup-enabled-${item}`}
                  />
                }
              />
            </FlagHighlight>
          ))}
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
            {restoreReason === "noEntries"
              ? t("backup_paused_no_entries")
              : t("backup_paused_other_phone")}
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
        {providers.length > 1 && enabled && (
          <TextInfo style={{ marginTop: 8 }}>{t("backup_one_cloud")}</TextInfo>
        )}

        {notes.map((item) => (
          <View key={item}>
            <MenuListHeadline>
              {notes.length > 1
                ? getProviderTitle(item)
                : t("backup_good_to_know")}
            </MenuListHeadline>
            <View style={{ paddingHorizontal: 12 }}>
              <MarkdownBody subtle>{getPrivacyText(item)}</MarkdownBody>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
