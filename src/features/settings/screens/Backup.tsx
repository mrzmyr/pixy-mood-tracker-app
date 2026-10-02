import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { Platform, ScrollView, Switch, View } from "react-native";
import { CheckCircle, Cloud } from "react-native-feather";
import { MarkdownBody } from "@/components/MarkdownBody";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { PageWithHeaderLayout } from "@/components/PageWithHeaderLayout";
import useColors from "@/hooks/useColors";
import { getLastBackupAt } from "@/lib/backup";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";

/** iOS system blue, the color of the iCloud symbol in iOS Settings. */
const ICLOUD_BLUE = "#007AFF";
const SUCCESS_GREEN = "#34C759";

const isAndroid = () => Platform.OS === "android";

const ProviderIcon = ({ color }: { color: string }) =>
  isAndroid() ? (
    <Cloud width={18} color={color} />
  ) : (
    <SymbolView
      name="icloud.fill"
      size={22}
      tintColor={ICLOUD_BLUE}
      fallback={<Cloud width={18} color={ICLOUD_BLUE} />}
    />
  );

/**
 * Last Android backup, read again whenever the screen gains focus. iOS never
 * reports backup times to apps, so the row does not show there.
 */
const useLastBackupAt = () => {
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLastBackupAt(getLastBackupAt());
    }, [])
  );

  return lastBackupAt;
};

/**
 * Settings > Data > Backup: switch for the phone backup (iCloud on iOS,
 * Google on Android), the last Android backup, and what the backup means for
 * privacy.
 *
 * The switch is stored in settings and applied to the OS by
 * `useBackupSetting`. See docs/backup.md.
 */
export const BackupScreen = () => {
  const colors = useColors();
  const analytics = useAnalytics();
  const { settings, setSettings } = useSettings();
  const lastBackupAt = useLastBackupAt();
  const enabled = settings.backupEnabled;
  const android = isAndroid();

  const toggle = (value: boolean) => {
    analytics.track("settings:backup_toggled", { enabled: value });
    setSettings((current) => ({ ...current, backupEnabled: value }));
  };

  return (
    <PageWithHeaderLayout
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView style={{ padding: 20 }}>
        <MenuList style={{ marginTop: 16 }}>
          <MenuListItem
            title={
              android ? t("backup_toggle_android") : t("backup_toggle_ios")
            }
            iconLeft={<ProviderIcon color={colors.menuListItemIcon} />}
            iconRight={
              <Switch
                ios_backgroundColor={colors.backgroundSecondary}
                onValueChange={toggle}
                value={enabled}
                testID="backup-enabled"
              />
            }
            isLast={!(enabled && android)}
          />
          {enabled && android && (
            <MenuListItem
              title={t("backup_last_sync")}
              value={
                lastBackupAt
                  ? dayjs(lastBackupAt).format("lll")
                  : t("backup_last_sync_never")
              }
              iconRight={
                lastBackupAt ? (
                  <CheckCircle width={18} color={SUCCESS_GREEN} />
                ) : null
              }
              testID="backup-last-sync"
              isLast
            />
          )}
        </MenuList>

        <View style={{ marginTop: 16, paddingBottom: 80 }}>
          <MarkdownBody>
            {android ? t("backup_privacy_android") : t("backup_privacy_ios")}
          </MarkdownBody>
        </View>
      </ScrollView>
    </PageWithHeaderLayout>
  );
};
