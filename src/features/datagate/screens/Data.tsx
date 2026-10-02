import { ScrollView, View } from "react-native";
import { Download, Trash, Upload } from "react-native-feather";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useDatagate } from "../DataGate";

/**
 * Settings > Data: import, export, and reset of all user data via
 * `useDatagate`. The direct AsyncStorage import is development-only.
 */
export const DataScreen = () => {
  const colors = useColors();
  const datagate = useDatagate();

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
          <MenuListItem
            title={t("export")}
            onPress={() => datagate.openExportDialog()}
            iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
            isLast
          />
        </MenuList>
        <TextInfo>{t("export_help")}</TextInfo>
        <MenuList style={{ marginTop: 16 }}>
          <MenuListItem
            testID="reset-data"
            title={t("reset_data_button")}
            onPress={async () => {
              try {
                await datagate.openResetDialog("data");
              } catch (error) {
                console.log(error);
              }
            }}
            iconLeft={<Trash width={18} color="red" />}
            style={{
              color: "red",
            }}
          />
          <MenuListItem
            testID="reset-factory"
            title={t("reset_factory_button")}
            onPress={async () => {
              try {
                await datagate.openResetDialog("factory");
              } catch (error) {
                console.log(error);
              }
            }}
            iconLeft={<Trash width={18} color="red" />}
            style={{
              color: "red",
            }}
            isLast
          />
        </MenuList>
        <TextInfo>{t("reset_factory_description")}</TextInfo>
      </ScrollView>
    </View>
  );
};
