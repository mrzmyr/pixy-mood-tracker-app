import { Platform, Text, View } from "react-native";
import Button from "@/components/Button";
import useColors from "@/hooks/useColors";
import { HeaderImage } from "./HeaderImage";
import { HeaderNavigation } from "./HeaderNavigation";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Clock,
  reminderTimeToDate,
  useReminder,
} from "@/features/notifications";
import { DEFAULT_REMINDER_TIME } from "@/constants/Settings";

import { useState } from "react";

import { useAnalytics } from "@/state/analytics";
import LinkButton from "@/components/LinkButton";
import { t, tDynamic } from "@/lib/translation";

const Body = ({ index }: { index: number }) => {
  const colors = useColors();

  return (
    <View
      style={{
        paddingVertical: 16,
        paddingHorizontal: 32,
      }}
    >
      <Text
        style={{
          color: colors.onboardingTitle,
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        {tDynamic(`onboarding_step_${index}_title`)}
      </Text>
      <Text
        style={{
          color: colors.onboardingBody,
          fontSize: 17,
          lineHeight: 24,
        }}
      >
        {tDynamic(`onboarding_step_${index}_body`)}
      </Text>
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
  const colors = useColors();
  const analytics = useAnalytics();

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
      <Animated.View
        style={{
          width: "100%",
          backgroundColor: colors.onboardingTopBackground,
          alignItems: "center",
          flex: 1,
        }}
        entering={FadeIn.duration(800)}
      >
        <HeaderImage
          index={index}
          style={{
            width: "95%",
            maxHeight: "100%",
            maxWidth: 360,
          }}
        />
      </Animated.View>
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
          <Animated.View
            style={{
              flex: 1,
            }}
            entering={FadeIn.duration(800)}
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
                  onChange={(event, date) => {
                    if (date) {
                      setTime(date);
                    }
                  }}
                />
              </View>
            </View>
          </Animated.View>
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
