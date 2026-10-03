import { FEATURE_FLAGS, useIsFeatureFlagOn } from "@/state/analytics";
import { IS_WIDGET_SUPPORTED } from "./widgets";

/**
 * Whether Settings shows the Home Screen widget entry and guide: iOS only,
 * behind the `home-screen-widget` PostHog flag. The widgets themselves stay
 * in the iOS gallery and keep syncing; a flag cannot hide a native widget.
 */
export const useIsWidgetEnabled = () => {
  const isFlagOn = useIsFeatureFlagOn(FEATURE_FLAGS.homeScreenWidget);
  return IS_WIDGET_SUPPORTED && isFlagOn;
};
