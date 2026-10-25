import { STEP_OPTIONS } from "@/constants/logger-steps";
import type {
  ConfigurableLoggerStep,
  LoggerStep,
} from "@/constants/logger-steps";

import {
  SettingsForm,
  SettingsRow,
  SettingsSection,
  SettingsSwitch,
} from "@/components/settings-form";
import { t } from "@/lib/translation";
import type { ReactElement } from "react";
import BedDouble from "lucide-react-native/icons/bed-double";
import Bell from "lucide-react-native/icons/bell";
import FileText from "lucide-react-native/icons/file-text";
import Heart from "lucide-react-native/icons/heart";
import ImageIcon from "lucide-react-native/icons/image";
import MapPin from "lucide-react-native/icons/map-pin";
import MessageSquare from "lucide-react-native/icons/message-square";
import Sun from "lucide-react-native/icons/sun";
import Tag from "lucide-react-native/icons/tag";
import Users from "lucide-react-native/icons/users";
import { useRouter } from "expo-router";
import useColors from "@/hooks/use-colors";
import { useFeatureFlag } from "@/state/feature-flags";
import { useLocationSetting } from "@/features/location";
import { useStepEnabled } from "../use-step-enabled";

/** Steps with their own settings page; the list links there instead of a switch. */
const STEP_PAGES = {
  tags: "/settings/steps/tags",
  people: "/settings/steps/people",
} as const;

const hasStepPage = (
  step: ConfigurableLoggerStep
): step is keyof typeof STEP_PAGES => step in STEP_PAGES;

/** One step in the Check-in list: a switch, or a link with On/Off for steps with a page. */
const StepRow = ({
  step,
  icon,
}: {
  step: ConfigurableLoggerStep;
  icon: ReactElement;
}) => {
  const router = useRouter();
  const { enabled, setEnabled } = useStepEnabled(step);
  const title = t(`logger_step_${step}`);

  if (hasStepPage(step)) {
    const page = STEP_PAGES[step];
    return (
      <SettingsRow
        title={title}
        icon={icon}
        value={enabled ? t("step_status_on") : t("step_status_off")}
        kind="navigation"
        onPress={() => router.push(page)}
        testID={`step-${step}`}
      />
    );
  }

  if (step === "rating") {
    return <SettingsRow title={title} icon={icon} />;
  }

  return (
    <SettingsSwitch
      label={title}
      icon={icon}
      value={enabled}
      onValueChange={setEnabled}
      testID={`step-${step}-enabled`}
    />
  );
};

/**
 * Settings > Check-in: the logger steps in order. `rating` cannot be turned
 * off. Tags and People open their own page with the switch and their list.
 * `people` and `photos` show only behind their feature flags. The location
 * switch shows behind the `location` feature flag. Quick check-ins live in
 * Settings > Reminders. Native grouped list on iOS and Android.
 */
export const StepsScreen = () => {
  const colors = useColors();
  const hasPeople = useFeatureFlag("people");
  const isPhotosEnabled = useFeatureFlag("photos");
  const {
    isAvailable: isLocationAvailable,
    isEnabled: isLocationEnabled,
    setEnabled: setLocationEnabled,
  } = useLocationSetting();
  const options = STEP_OPTIONS.filter(
    (option) =>
      (option !== "people" || hasPeople) &&
      (option !== "photos" || isPhotosEnabled)
  );

  const ICONS_MAP: Record<LoggerStep, ReactElement> = {
    rating: <Sun width={20} height={20} stroke={colors.text} />,
    message: <FileText width={20} height={20} color={colors.text} />,
    photos: <ImageIcon width={20} height={20} color={colors.text} />,
    tags: <Tag width={20} height={20} color={colors.text} />,
    people: <Users width={20} height={20} color={colors.text} />,
    sleep: <BedDouble size={20} color={colors.text} />,
    emotions: <Heart width={20} height={20} color={colors.text} />,
    feedback: <MessageSquare width={20} height={20} color={colors.text} />,
    reminder: <Bell width={20} height={20} color={colors.text} />,
  };

  return (
    <SettingsForm>
      <SettingsSection title={t("steps_introduction")}>
        {options.map((option) => (
          <StepRow key={option} step={option} icon={ICONS_MAP[option]} />
        ))}
      </SettingsSection>
      {isLocationAvailable && (
        <SettingsSection
          flag="location"
          footer={t("location_setting_description")}
        >
          <SettingsSwitch
            label={t("location_setting")}
            icon={<MapPin width={20} height={20} color={colors.text} />}
            value={isLocationEnabled}
            onValueChange={setLocationEnabled}
            testID="location-enabled"
          />
        </SettingsSection>
      )}
    </SettingsForm>
  );
};
