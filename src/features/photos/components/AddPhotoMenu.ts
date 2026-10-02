import { ActionSheetIOS, Alert, Platform } from "react-native";
import { t } from "@/lib/translation";

/**
 * Asks where the photo comes from: library or camera. With `dayAccess`, a
 * third option asks for photo library access, so photos of the day stay
 * reachable after the user dismissed the permission row. iOS shows an
 * action sheet, other platforms an alert. Cancel calls no callback.
 */
export const showAddPhotoMenu = ({
  onLibrary,
  onCamera,
  dayAccess,
}: {
  onLibrary: () => void;
  onCamera: () => void;
  dayAccess?: { label: string; onPress: () => void };
}) => {
  const options = [
    { text: t("photos_choose_library"), onPress: onLibrary },
    { text: t("photos_take_photo"), onPress: onCamera },
    ...(dayAccess
      ? [{ text: dayAccess.label, onPress: dayAccess.onPress }]
      : []),
  ];

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...options.map(({ text }) => text), t("cancel")],
        cancelButtonIndex: options.length,
      },
      (buttonIndex) => {
        options[buttonIndex]?.onPress();
      }
    );
    return;
  }

  Alert.alert(
    t("photos_add"),
    undefined,
    [...options, { text: t("cancel"), style: "cancel" }],
    { cancelable: true }
  );
};
