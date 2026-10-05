import { useRouter } from "expo-router";
import { useEffect, useEffectEvent } from "react";
import { Demo } from "@/components/Demo";
import { t, tDynamic } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { GuideImage } from "./GuideImage";

/** Steps: jiggle mode, add widget, pick Pixy. */
const STEP_COUNT = 3;

/**
 * Modal that teaches how to add a Pixy widget to the iOS Home Screen.
 * Steps 1 to 3 show one screenshot each. Opened from Settings > Widgets.
 */
export const WidgetGuide = () => {
  const router = useRouter();
  const analytics = useAnalytics();

  const trackOpened = useEffectEvent(() => {
    analytics.track("widget:guide_opened");
  });

  useEffect(() => {
    trackOpened();
  }, []);

  const steps = Array.from({ length: STEP_COUNT }, (_, index) => {
    const step = index + 1;

    return {
      title: tDynamic(`widget_guide_step_${step}_title`),
      body: tDynamic(`widget_guide_step_${step}_body`),
      content: <GuideImage step={step} />,
    };
  });

  return (
    <Demo
      steps={steps}
      testID="widget-guide"
      labels={{
        next: t("onboarding_next"),
        done: t("done"),
      }}
      onStepChange={({ step }) => {
        analytics.track("widget:guide_step_viewed", { step });
      }}
      onDismiss={({ step }) => {
        analytics.track("widget:guide_dismissed", { step });
        router.back();
      }}
      onComplete={() => {
        analytics.track("widget:guide_completed");
        router.back();
      }}
    />
  );
};
