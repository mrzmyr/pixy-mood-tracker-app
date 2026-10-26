import { Platform, View } from "react-native";
import Button from "@/components/button";
import {
  Clock,
  reminderTimeToDate,
  useReminder,
} from "@/features/notifications";
import { DEFAULT_REMINDER_TIME } from "@/constants/settings";

import { useState } from "react";

import { useAnalytics } from "@/state/analytics";
import LinkButton from "@/components/link-button";
import { t } from "@/lib/translation";
import { QuestionLayout } from "./question-layout";
import type { QuestionNavigation } from "./question-layout";

/**
 * Onboarding reminder opt-in. Enabling replaces all scheduled
 * notifications with one daily reminder; the flow continues even when
 * permission is denied.
 */
export const ReminderSlide = ({
  navigation,
  onNext,
}: {
  navigation: QuestionNavigation;
  onNext: () => void;
}) => {
  const analytics = useAnalytics();

  const reminder = useReminder();

  const [time, setTime] = useState(() =>
    reminderTimeToDate(DEFAULT_REMINDER_TIME)
  );

  const onLater = () => {
    analytics.track("onboarding:reminder_postponed");
    onNext();
  };

  const onEnable = async () => {
    analytics.track("onboarding:reminder_enabled");
    await reminder.enable(time);
    onNext();
  };

  return (
    <QuestionLayout
      navigation={navigation}
      title={t("onboarding_step_4_title")}
      subtitle={t("onboarding_step_4_body")}
      footer={
        <>
          <Button testID="onboarding-reminder-enable" onPress={onEnable}>
            {t("onboarding_step_4_button_1")}
          </Button>
          <LinkButton
            type="secondary"
            onPress={onLater}
            style={{
              paddingTop: 16,
              paddingBottom: 8,
            }}
          >
            {t("onboarding_step_4_button_2")}
          </LinkButton>
        </>
      }
    >
      <View
        style={{
          maxWidth: Platform.OS === "ios" ? 80 : 65,
          justifyContent: "center",
        }}
      >
        <Clock timeDate={time} onChange={setTime} />
      </View>
    </QuestionLayout>
  );
};
