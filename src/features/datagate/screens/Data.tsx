import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { Cloud, Download, Trash, Upload } from "react-native-feather";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useFeatureFlag } from "@/state/featureFlags";
import { useDatagate } from "../DataGate";

/**
 * Settings > Data: the data hub. Backup (opens the Backup page, needs the
 * `backup` feature flag), import and export, and deletion of all user data
 * via `useDatagate`. The direct AsyncStorage import is development-only.
 */
export const DataScreen = () => {
  const colors = useColors();
  const router = useRouter();
  const datagate = useDatagate();
  const isBackupOn = useFeatureFlag("backup");

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{
          padding: 20,
          flex: 1,
        }}
      >
        {isBackupOn && (
          <MenuList style={{ marginTop: 16 }}>
            <MenuListItem
              title={t("backup")}
              onPress={() => router.push("/settings/data/backup")}
              iconLeft={<Cloud width={18} color={colors.menuListItemIcon} />}
              testID="backup"
              isLink
            />
          </MenuList>
        )}
        <MenuList style={{ marginTop: 16 }}>
          <MenuListItem
            title={t("import")}
            onPress={() => datagate.openImportDialog()}
            iconLeft={<Download width={18} color={colors.menuListItemIcon} />}
          />
          {__DEV__ && (
            <MenuListItem
              title="Dangerously Import Directly To AsyncStorage"
              onPress={() =>
                datagate.openDangerousImportDirectlyToAsyncStorageDialog()
              }
              iconLeft={<Download width={18} color={colors.menuListItemIcon} />}
            />
          )}
        </MenuList>
        <MenuListHeadline>{t("export")}</MenuListHeadline>
        <MenuList>
          <MenuListItem
            testID="export-json"
            title="JSON"
            onPress={() => datagate.openExportDialog({ format: "json" })}
            iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
          />
          <MenuListItem
            testID="export-csv"
            title="CSV"
            onPress={() => datagate.openExportDialog({ format: "csv" })}
            iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
          />
        </MenuList>
        <TextInfo>{`${t("export_help")}\n${t("export_csv_help")}`}</TextInfo>
        <TextInfo style={{ paddingTop: 0 }}>
          {t("data_export_photos_note")}
        </TextInfo>
        <MenuList style={{ marginTop: 16 }}>
          <MenuListItem
            testID="delete-all-data"
            title={t("delete_all_data_button")}
            onPress={async () => {
              try {
                await datagate.openResetDialog();
              } catch (error) {
                console.log(error);
              }
            }}
            iconLeft={<Trash width={18} color="red" />}
            style={{
              color: "red",
            }}
          />
        </MenuList>
        <TextInfo>{t("delete_all_data_description")}</TextInfo>
      </ScrollView>
    </View>
  );
};
