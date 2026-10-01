import { LayoutAnimation } from "react-native";
import type { ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { showAddPhotoMenu, usePhotoActions } from "@/features/photos";
import type { LogPhoto } from "@/types";
import { getSlidePaddingBottom } from "../attachmentTray";
import type { LoggerMode } from "../Logger";
import type { TemporaryLogValue } from "../temporaryLog";

/**
 * Draft photos of the logger: the header paperclip action, the tray remove
 * action, and the slide area style that keeps slide content clear of the
 * tray. Tray changes animate unless the system asks to reduce motion.
 */
export const useLoggerPhotos = ({
  mode,
  tempLog,
}: {
  mode: LoggerMode;
  tempLog: TemporaryLogValue;
}) => {
  const isReducedMotion = useReducedMotion();
  const { photos } = tempLog.data;

  const actions = usePhotoActions({
    photos,
    mode,
    onChange: (next: LogPhoto[]) => {
      if (!isReducedMotion) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      tempLog.update({ photos: next });
    },
  });

  const addPhoto = () => {
    // A full entry skips the menu: the library action shows the limit alert.
    if (actions.isFull) {
      actions.addFromLibrary();
      return;
    }
    showAddPhotoMenu({
      onLibrary: actions.addFromLibrary,
      onCamera: actions.addFromCamera,
    });
  };

  return {
    photos,
    addPhoto,
    removePhoto: actions.remove,
    slideAreaStyle: {
      flex: 1,
      flexDirection: "column",
      paddingBottom: getSlidePaddingBottom({ photosCount: photos.length }),
    } satisfies ViewStyle,
  };
};
