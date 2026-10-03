import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useEffectEvent } from "react";
import { Platform, View } from "react-native";
import Button from "@/components/Button";
import { Demo } from "@/components/Demo";
import type { DemoStep } from "@/components/Demo";
import { DemoImage } from "@/components/DemoImage";
import { typeSpace } from "@/constants/typeSpace";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";

/** Google video that shows how to set up Private space. */
const PRIVATE_SPACE_VIDEO_URL = "https://youtu.be/CFgxxEj3qdA";

/**
 * Real screenshots of the OS lock flow. Replace the files in
 * `assets/images/app-lock`; see docs/app-lock.md.
 */
const IOS_IMAGES = [
  require("../../../../../assets/images/app-lock/ios-step-1.jpg"),
  require("../../../../../assets/images/app-lock/ios-step-2.jpg"),
  require("../../../../../assets/images/app-lock/ios-step-3.jpg"),
];
const ANDROID_IMAGE = require("../../../../../assets/images/app-lock/android-private-space.jpg");

const getIosSteps = (): DemoStep[] =>
  IOS_IMAGES.map((image, index) => {
    const step = index + 1;

    return {
      title: t(`app_lock_guide_ios_step_${step}_title`),
      body: t(`app_lock_guide_ios_step_${step}_body`),
      content: <DemoImage source={image} />,
    };
  });

const PrivateSpaceContent = ({
  onWatchVideo,
}: {
  onWatchVideo: () => void;
}) => (
  <View style={{ flex: 1, minHeight: 0, gap: typeSpace.related }}>
    <DemoImage source={ANDROID_IMAGE} />
    <Button
      type="secondary"
      testID="app-lock-guide-video"
      onPress={onWatchVideo}
    >
      {t("app_lock_guide_android_video")}
    </Button>
  </View>
);

/**
 * Modal that teaches how to lock Pixy with the OS. iOS: Require Face ID,
 * 3 steps. Android: Private space, 1 step with a video link. Opened from
 * Settings > App lock.
 */
export const AppLockGuide = () => {
  const router = useRouter();
  const analytics = useAnalytics();

  const trackOpened = useEffectEvent(() => {
    analytics.track("app_lock:guide_opened");
  });

  useEffect(() => {
    trackOpened();
  }, []);

  const steps: DemoStep[] =
    Platform.OS === "ios"
      ? getIosSteps()
      : [
          {
            title: t("app_lock_guide_android_title"),
            body: t("app_lock_guide_android_body"),
            content: (
              <PrivateSpaceContent
                onWatchVideo={async () => {
                  analytics.track("app_lock:video_opened");
                  await WebBrowser.openBrowserAsync(PRIVATE_SPACE_VIDEO_URL);
                }}
              />
            ),
          },
        ];

  return (
    <Demo
      steps={steps}
      testID="app-lock-guide"
      labels={{
        next: t("onboarding_next"),
        back: t("widget_guide_back"),
        done: t("done"),
        close: t("close"),
      }}
      onStepChange={({ step }) => {
        analytics.track("app_lock:guide_step_viewed", { step });
      }}
      onDismiss={({ step }) => {
        analytics.track("app_lock:guide_dismissed", { step });
        router.back();
      }}
      onComplete={() => {
        analytics.track("app_lock:guide_completed");
        router.back();
      }}
    />
  );
};
