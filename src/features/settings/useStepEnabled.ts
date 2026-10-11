import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";

/**
 * Whether a logger step is on, and a toggle that flips it in the settings
 * and tracks `settings:step_toggled`. Shared by the Check-in list and the
 * Tags and People pages so both write the same setting.
 */
export const useStepEnabled = (step: ConfigurableLoggerStep) => {
  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const enabled = new Set(settings.steps).has(step);

  const setEnabled = (next: boolean) => {
    analytics.track("settings:step_toggled", { step, enabled: next });
    setSettings((currentSettings) => ({
      ...currentSettings,
      steps: next
        ? [...currentSettings.steps.filter((current) => current !== step), step]
        : currentSettings.steps.filter((current) => current !== step),
    }));
  };

  return { enabled, setEnabled };
};
