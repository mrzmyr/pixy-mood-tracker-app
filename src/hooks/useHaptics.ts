/* istanbul ignore file */

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Module-level so the returned object is stable across renders.
const haptics = {
  selection: async () => {
    if (Platform.OS === "ios") {
      await Haptics.selectionAsync();
    }
  },
  success: async () => {
    if (Platform.OS === "ios") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
};

const useHaptics = () => haptics;

export default useHaptics;
