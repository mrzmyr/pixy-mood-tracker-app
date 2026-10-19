import { useSyncExternalStore } from "react";
import { Dimensions } from "react-native";

const subscribe = (listener: () => void) => {
  const subscription = Dimensions.addEventListener("change", listener);
  return () => subscription.remove();
};

const getSnapshot = () => Dimensions.get("screen").height;

/**
 * Screen height in points. Re-renders when the display changes size, for
 * example on foldables. `useWindowDimensions` covers only the window.
 */
export const useScreenHeight = (): number =>
  useSyncExternalStore(subscribe, getSnapshot);
