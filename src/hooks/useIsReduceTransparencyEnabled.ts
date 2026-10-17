import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * True while the iOS setting Reduce Transparency is on. Glass and blur must
 * then render a solid surface. Always false on Android and web.
 */
// oxlint-disable-next-line pixy-standards/boolean-function-prefix -- React hooks must start with `use`.
export const useIsReduceTransparencyEnabled = (): boolean => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setIsEnabled
    );
    const readSetting = async () => {
      try {
        const value = await AccessibilityInfo.isReduceTransparencyEnabled();
        if (isMounted) {
          setIsEnabled(value);
        }
      } catch {
        // Unknown setting: keep glass, as before this check existed.
      }
    };
    void readSetting();
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return isEnabled;
};
