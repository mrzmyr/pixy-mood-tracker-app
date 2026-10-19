import { ScrollView, View } from "react-native";
import Download from "lucide-react-native/icons/download";
import Trash from "lucide-react-native/icons/trash";
import Upload from "lucide-react-native/icons/upload";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { useDatagate } from "../data-gate";

/**
 * Settings > Data: import, export, and deletion of all user data via
 * `useDatagate`. The direct AsyncStorage import is development-only.
 */
export const DataScreen = () => {
  const colors = useColors();
  const iconProps = { width: 20, height: 20, color: colors.menuListItemIcon };
  const datagate = useDatagate();
  const paddingBottom = useScrollBottomPadding(20);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom }}
      >
        <MenuList style={{ marginTop: 16 }}>
          <MenuListItem
            title={t("import")}
            onPress={() => datagate.openImportDialog()}
            iconLeft={<Download {...iconProps} />}
          />
          {__DEV__ && (
            <MenuListItem
              title="Dangerously Import Directly To AsyncStorage"
              onPress={() =>
                datagate.openDangerousImportDirectlyToAsyncStorageDialog()
              }
              iconLeft={<Download {...iconProps} />}
            />
          )}
        </MenuList>
        <MenuListHeadline>{t("export")}</MenuListHeadline>
        <MenuList>
          <MenuListItem
            testID="export-json"
            title="JSON"
            onPress={() => datagate.openExportDialog({ format: "json" })}
            iconLeft={<Upload {...iconProps} />}
          />
          <MenuListItem
            testID="export-csv"
            title="CSV"
            onPress={() => datagate.openExportDialog({ format: "csv" })}
            iconLeft={<Upload {...iconProps} />}
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
            iconLeft={<Trash width={20} height={20} color={colors.danger} />}
            style={{
              color: colors.danger,
            }}
          />
        </MenuList>
        <TextInfo>{t("delete_all_data_description")}</TextInfo>
      </ScrollView>
    </View>
  );
};
