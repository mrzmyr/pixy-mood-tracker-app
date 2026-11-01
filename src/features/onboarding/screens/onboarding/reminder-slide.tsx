import { Platform, View } from "react-native";
import Button from "@/components/button";
import useColors from "@/hooks/use-colors";
import { TextReveal } from "@/components/text-reveal";
import { getTextStyle } from "@/components/typography";
import { getTextRevealDuration } from "@/components/text-reveal-parts";
import { SLIDE_TEXT_DELAY_MS } from "./slide-timing";
import { HeaderImage } from "./header-image";
import { HeaderNavigation } from "./header-navigation";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import {
  Clock,
  reminderTimeToDate,
  useReminder,
} from "@/features/notifications";
import { DEFAULT_REMINDER_TIME } from "@/constants/settings";

import { useState } from "react";

import { useAnalytics } from "@/state/analytics";
import LinkButton from "@/components/link-button";
import { t, tDynamic } from "@/lib/translation";

const Body = ({ index }: { index: number }) => {
  const colors = useColors();
  const title = tDynamic(`onboarding_step_${index}_title`);

  return (
    <View
      style={{
        paddingVertical: 16,
        paddingHorizontal: 32,
      }}
    >
      <TextReveal
        accessibilityRole="header"
        delay={SLIDE_TEXT_DELAY_MS}
        containerStyle={{ marginBottom: 8 }}
        style={{
          color: colors.onboardingTitle,
          ...getTextStyle("heading", 20),
          fontWeight: "bold",
        }}
      >
        {title}
      </TextReveal>
      <TextReveal
        delay={SLIDE_TEXT_DELAY_MS + getTextRevealDuration(title) * 0.5}
        style={{
          color: colors.onboardingBody,
          ...getTextStyle("copy", 16),
          lineHeight: 24,
        }}
      >
        {tDynamic(`onboarding_step_${index}_body`)}
      </TextReveal>
    </View>
  );
};

/**
 * Onboarding reminder opt-in. Enabling replaces all scheduled
 * notifications with one daily reminder; the flow continues even when
 * permission is denied.
 */
export const ReminderSlide = ({
  index,
  setIndex,
  onSkip,
}: {
  index: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
}) => {
  const analytics = useAnalytics();
  const colors = useColors();

  const reminder = useReminder();

  const [time, setTime] = useState(() =>
    reminderTimeToDate(DEFAULT_REMINDER_TIME)
  );

  const onLater = () => {
    analytics.track("onboarding:reminder_postponed");
    setIndex(index + 1);
  };

  const onEnable = async () => {
    analytics.track("onboarding:reminder_enabled");
    await reminder.enable(time);
    setIndex(index + 1);
  };

  return (
    <>
      <View
        style={{
          width: "100%",
          alignItems: "center",
          flex: 1,
        }}
      >
        <HeaderImage
          index={index}
          // Same size as the old RN Image: asset height (1030), capped at 100%.
          style={{
            width: "95%",
            height: "100%",
            maxWidth: 360,
          }}
        />
      </View>
      <View
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <HeaderNavigation onSkip={onSkip} index={index} setIndex={setIndex} />
          <View
            style={{
              flex: 1,
            }}
          >
            <Body index={index} />
            <View
              style={{
                paddingHorizontal: 32,
              }}
            >
              <View
                style={{
                  maxWidth: Platform.OS === "ios" ? 80 : 65,
                  justifyContent: "center",
                }}
              >
                <Clock
                  timeDate={time}
                  onChange={setTime}
                  background={colors.onboardingControlBackground}
                />
              </View>
            </View>
            <SkyFlightZone style={{ flex: 1, marginBottom: -12 }} />
          </View>
        </View>
        <View
          style={{
            paddingHorizontal: 32,
            paddingVertical: 16,
          }}
        >
          <Button onPress={onEnable}>{t("onboarding_step_4_button_1")}</Button>
          <LinkButton
            type="secondary"
            onPress={onLater}
            style={{
              paddingTop: 16,
              paddingBottom: 16,
            }}
          >
            {t("onboarding_step_4_button_2")}
          </LinkButton>
        </View>
      </View>
    </>
  );
};
