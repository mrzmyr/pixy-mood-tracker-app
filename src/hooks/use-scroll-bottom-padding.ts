import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Bottom padding for a scroll view `contentContainerStyle`, so the last row
 * clears the home indicator or gesture bar.
 *
 * Pair with `contentInsetAdjustmentBehavior="automatic"`: iOS then adds the
 * home indicator inset itself, scroll indicator included. Android draws edge
 * to edge and has no inset behavior, so the gesture bar inset is added here.
 */
export const useScrollBottomPadding = (padding: number): number => {
  const insets = useSafeAreaInsets();
  return padding + (Platform.OS === "android" ? insets.bottom : 0);
};
