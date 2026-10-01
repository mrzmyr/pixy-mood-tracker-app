import { useRouter } from "expo-router";
import { Platform, ScrollView, View } from "react-native";
import { HardDrive, Upload } from "react-native-feather";
import { MarkdownBody } from "@/components/MarkdownBody";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { PageWithHeaderLayout } from "@/components/PageWithHeaderLayout";
import TextInfo from "@/components/TextInfo";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/**
 * Settings > Backup: explains that the OS backs Pixy's data up with the
 * phone (iOS device backup, Android Auto Backup), what that means for
 * privacy, and links to the manual file export.
 *
 * Pixy has no backup code of its own here. The Android rules live in
 * `plugins/withAndroidBackupRules.js`; see docs/backup.md.
 */
export const BackupScreen = () => {
  const colors = useColors();
  const router = useRouter();

  const content =
    Platform.OS === "android"
      ? t("backup_content_android")
      : t("backup_content_ios");

  return (
    <PageWithHeaderLayout
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{
          padding: 16,
        }}
      >
        <View
          style={{
            paddingBottom: 80,
          }}
        >
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              padding: 16,
            }}
          >
            <HardDrive color={colors.text} width={80} height={30} />
          </View>
          <MarkdownBody>{content}</MarkdownBody>

          <MenuList
            style={{
              marginTop: 16,
            }}
          >
            <MenuListItem
              title={t("backup_export_button")}
              onPress={() => router.push("/settings/data")}
              iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
              testID="backup-export"
              isLink
              isLast
            />
          </MenuList>
          <TextInfo>{t("backup_export_help")}</TextInfo>
        </View>
      </ScrollView>
    </PageWithHeaderLayout>
  );
};
