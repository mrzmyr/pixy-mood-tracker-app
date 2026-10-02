import { Platform, ScrollView, Text } from "react-native";
import { Cloud, Key, Shield, User } from "react-native-feather";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { PageWithHeaderLayout } from "@/components/PageWithHeaderLayout";
import TextInfo from "@/components/TextInfo";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/** Picks the iOS or Android variant of a backup string. */
const platformText = (ios: string, android: string) =>
  Platform.OS === "android" ? t(android) : t(ios);

/** Non-pressable list row whose text may wrap over several lines. */
const InfoRow = ({
  icon,
  text,
  isLast,
}: {
  icon: React.ReactElement;
  text: string;
  isLast?: boolean;
}) => {
  const colors = useColors();

  return (
    <MenuListItem
      iconLeft={icon}
      title={
        <Text
          style={{
            fontSize: 15,
            lineHeight: 20,
            color: colors.menuListItemText,
          }}
        >
          {text}
        </Text>
      }
      style={{ paddingTop: 12, paddingBottom: 12 }}
      isLast={isLast}
    />
  );
};

/**
 * Settings > Data > Backup: Pixy is part of the phone backup (iOS device
 * backup, Android Auto Backup). Shows the status, who can read the backup,
 * and how to leave it.
 *
 * Pixy has no backup code of its own here. The Android rules live in
 * `plugins/withAndroidBackupRules.js`; see docs/backup.md.
 */
export const BackupScreen = () => {
  const colors = useColors();
  const iconProps = { width: 18, color: colors.menuListItemIcon };

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
            title={platformText(
              "backup_status_title_ios",
              "backup_status_title_android"
            )}
            value={t("backup_status_value")}
            iconLeft={<Cloud {...iconProps} />}
            testID="backup-status"
            isLast
          />
        </MenuList>
        <TextInfo>
          {platformText("backup_status_help_ios", "backup_status_help_android")}
        </TextInfo>

        <MenuListHeadline>{t("privacy")}</MenuListHeadline>
        <MenuList>
          <InfoRow
            icon={<Shield {...iconProps} />}
            text={t("backup_privacy_no_server")}
          />
          <InfoRow
            icon={<Key {...iconProps} />}
            text={platformText(
              "backup_privacy_provider_ios",
              "backup_privacy_provider_android"
            )}
          />
          <InfoRow
            icon={<User {...iconProps} />}
            text={platformText(
              "backup_privacy_account_ios",
              "backup_privacy_account_android"
            )}
            isLast
          />
        </MenuList>
        <TextInfo style={{ marginBottom: 80 }}>
          {platformText(
            "backup_privacy_help_ios",
            "backup_privacy_help_android"
          )}
        </TextInfo>
      </ScrollView>
    </PageWithHeaderLayout>
  );
};
