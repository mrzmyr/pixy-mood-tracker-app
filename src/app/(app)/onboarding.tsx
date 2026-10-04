import { Onboarding, OnboardingSurvey } from "@/features/onboarding";
import { useFeatureFlag } from "@/state/featureFlags";

/**
 * Onboarding route. The `onboarding-survey` flag switches to the survey.
 * Flags load only after onboarding and consent, so in production only a
 * development override turns it on.
 */
const OnboardingRoute = () =>
  useFeatureFlag("onboarding-survey") ? <OnboardingSurvey /> : <Onboarding />;

export default OnboardingRoute;
