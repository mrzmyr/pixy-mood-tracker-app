import { FEATURE_FLAGS, useIsFeatureFlagOn } from "@/state/analytics";
import { IS_WIDGET_SUPPORTED } from "./widgets";

/**
 * Whether Settings shows the Widgets entry and guide: iOS only, behind the
 * `home-screen-widget` PostHog flag. When off, the widgets themselves show
 * "Not available"; iOS still lists them in the gallery.
 */
export const useIsWidgetEnabled = () => {
  const isFlagOn = useIsFeatureFlagOn(FEATURE_FLAGS.homeScreenWidget);
  return IS_WIDGET_SUPPORTED && isFlagOn;
};
