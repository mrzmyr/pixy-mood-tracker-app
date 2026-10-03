import { useRouter } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import { PageModalLayout } from "@/components/PageModalLayout";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { GuideImage } from "./GuideImage";
import { GuideProgress } from "./GuideProgress";

/** Steps: jiggle mode, add widget, pick Pixy. */
const STEPS = 3;

/**
 * Modal that teaches how to add a Pixy widget to the iOS Home Screen.
 * Steps 1 to 3 show one screenshot each. Opened from Settings > Widgets.
 */
export const WidgetGuide = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const [step, setStep] = useState(1);

  const trackOpened = useEffectEvent(() => {
    analytics.track("widget:guide_opened");
  });

  useEffect(() => {
    trackOpened();
  }, []);

  const goTo = (nextStep: number) => {
    setStep(nextStep);
    analytics.track("widget:guide_step_viewed", { step: nextStep });
  };

  const close = (reason: "dismissed" | "completed") => {
    if (reason === "completed") {
      analytics.track("widget:guide_completed");
    } else {
      analytics.track("widget:guide_dismissed", { step });
    }
    router.back();
  };

  const isFirst = step === 1;
  const isLast = step === STEPS;

  return (
    <PageModalLayout
      style={{
        backgroundColor: colors.background,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <GuideProgress
        step={step}
        steps={STEPS}
        onClose={() => close("dismissed")}
      />
      <Animated.View
        key={step}
        entering={FadeIn.duration(300)}
        style={{ flex: 1, paddingHorizontal: 20 }}
      >
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <Text
            testID="widget-guide-title"
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {t(`widget_guide_step_${step}_title`)}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 17,
              lineHeight: 24,
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            {t(`widget_guide_step_${step}_body`)}
          </Text>
        </View>
        <GuideImage step={step} />
        <View style={{ paddingTop: 24, gap: 8 }}>
          <Button
            testID="widget-guide-next"
            onPress={() => (isLast ? close("completed") : goTo(step + 1))}
          >
            {t(isLast ? "done" : "onboarding_next")}
          </Button>
          {/* Hidden, not removed, on step 1 so the image keeps its size. */}
          <View
            pointerEvents={isFirst ? "none" : "auto"}
            accessibilityElementsHidden={isFirst}
            importantForAccessibility={isFirst ? "no-hide-descendants" : "auto"}
            style={{ opacity: isFirst ? 0 : 1 }}
          >
            <Button
              type="tertiary"
              testID="widget-guide-back"
              onPress={() => goTo(step - 1)}
            >
              {t("widget_guide_back")}
            </Button>
          </View>
        </View>
      </Animated.View>
    </PageModalLayout>
  );
};
