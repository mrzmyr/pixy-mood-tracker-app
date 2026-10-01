import { ActionSheetIOS, Alert, Platform } from "react-native";
import { t } from "@/lib/translation";

/**
 * Asks where the photo comes from: library or camera. iOS shows an action
 * sheet, other platforms an alert. Cancel calls neither callback.
 *
 * Concepts with separate library and camera buttons skip this menu.
 */
export const showAddPhotoMenu = ({
  onLibrary,
  onCamera,
}: {
  onLibrary: () => void;
  onCamera: () => void;
}) => {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          t("photos_choose_library"),
          t("photos_take_photo"),
          t("cancel"),
        ],
        cancelButtonIndex: 2,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          onLibrary();
        } else if (buttonIndex === 1) {
          onCamera();
        }
      }
    );
    return;
  }

  Alert.alert(
    t("photos_add"),
    undefined,
    [
      { text: t("photos_choose_library"), onPress: onLibrary },
      { text: t("photos_take_photo"), onPress: onCamera },
      { text: t("cancel"), style: "cancel" },
    ],
    { cancelable: true }
  );
};
