import { useLogLoad } from "@/features/logs";
import { usePeopleLoad } from "@/features/people";
import { useTagsLoad } from "@/features/tags";
import { useFeatureFlagState } from "@/state/feature-flags";
import { useSetting, useSettingsLoad } from "@/state/settings";

/**
 * Whether a glance surface should run. Both values stay `false` until the
 * flag, settings, entries, people, and tags are loaded: the app renders
 * while stores load, and an early "off" would end a running check-in.
 *
 * - `isEnabled`: show the surface and import its taps
 * - `isDisabled`: remove the surface
 */
export const useQuickCheckInStatus = (isSupported: boolean) => {
  const flagState = useFeatureFlagState("quick-check-in");
  const isSettingOn = useSetting("quickCheckInEnabled") === true;
  const loads = [
    useSettingsLoad(),
    useLogLoad(),
    usePeopleLoad(),
    useTagsLoad(),
  ];
  const isReady = loads.every((load) => load.status === "ready");
  const isKnown = isSupported && isReady && flagState !== "loading";
  const isOn = flagState === "on" && isSettingOn;
  return { isEnabled: isKnown && isOn, isDisabled: isKnown && !isOn };
};
