import { STEP_OPTIONS } from "@/constants/LoggerSteps";
import type {
  ConfigurableLoggerStep,
  LoggerStep,
} from "@/constants/LoggerSteps";

import FlagHighlight from "@/components/FlagHighlight";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { t } from "@/lib/translation";
import { Fragment } from "react";
import type { ReactElement } from "react";
import { BedDouble } from "lucide-react-native";
import { ScrollView, Switch, Text, View } from "react-native";
import {
  Bell,
  ChevronRight,
  FileText,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Sun,
  Tag,
  Users,
} from "react-native-feather";
import { useRouter } from "expo-router";
import useColors from "@/hooks/useColors";
import { useFeatureFlag } from "@/state/featureFlags";
import type { FeatureFlag } from "@/state/featureFlags/keys";
import { useLocationSetting } from "@/features/location";
import { useStepEnabled } from "../useStepEnabled";

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
  const colors = useColors();
  const router = useRouter();
  const { enabled, setEnabled } = useStepEnabled(step);
  const page = hasStepPage(step) ? STEP_PAGES[step] : null;

  let iconRight: ReactElement | undefined;
  if (page === null && step !== "rating") {
    iconRight = (
      <Switch
        accessibilityLabel={t(`logger_step_${step}`)}
        testID={`step-${step}-enabled`}
        onValueChange={setEnabled}
        value={enabled}
      />
    );
  }

  if (page !== null) {
    iconRight = (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 17, color: colors.textSecondary }}>
          {enabled ? t("step_status_on") : t("step_status_off")}
        </Text>
        <ChevronRight width={18} color={colors.menuListItemIcon} />
      </View>
    );
  }

  return (
    <MenuListItem
      title={t(`logger_step_${step}`)}
      iconLeft={icon}
      iconRight={iconRight}
      onPress={page === null ? null : () => router.push(page)}
      testID={page === null ? undefined : `step-${step}`}
    />
  );
};

/** Steps that show only behind a feature flag. */
const STEP_FLAGS: Partial<Record<LoggerStep, FeatureFlag>> = {
  people: "people",
  photos: "photos",
};

/** Switch that adds the current place to new check-ins. */
const LocationRow = () => {
  const colors = useColors();
  const { isEnabled, setEnabled } = useLocationSetting();

  return (
    <>
      {/* The margin sits outside: FlagHighlight drops its style when highlight is off. */}
      <View style={{ marginTop: 24 }}>
        <FlagHighlight flag="location">
          <MenuList>
            <MenuListItem
              title={t("location_setting")}
              iconLeft={<MapPin width={20} height={20} color={colors.text} />}
              iconRight={
                <Switch
                  accessibilityLabel={t("location_setting")}
                  testID="location-enabled"
                  onValueChange={setEnabled}
                  value={isEnabled}
                />
              }
            />
          </MenuList>
        </FlagHighlight>
      </View>
      <TextInfo>{t("location_setting_description")}</TextInfo>
    </>
  );
};

/**
 * Settings > Check-in: the logger steps in order. `rating` cannot be turned
 * off. Tags and People open their own page with the switch and their list.
 * `people` and `photos` show only behind their feature flags. The location
 * switch shows behind the `location` feature flag.
 */
export const StepsScreen = () => {
  const colors = useColors();
  const hasPeople = useFeatureFlag("people");
  const isPhotosEnabled = useFeatureFlag("photos");
  const { isAvailable: isLocationAvailable } = useLocationSetting();
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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{
          padding: 20,
          flex: 1,
        }}
      >
        <View
          style={{
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: colors.textSecondary,
            }}
          >
            {t("steps_introduction")}
          </Text>
        </View>
        <MenuList style={{ marginTop: 16 }}>
          {options.map((option) => {
            const flag = STEP_FLAGS[option];
            const row = <StepRow step={option} icon={ICONS_MAP[option]} />;
            return flag === undefined ? (
              <Fragment key={option}>{row}</Fragment>
            ) : (
              <FlagHighlight key={option} flag={flag}>
                {row}
              </FlagHighlight>
            );
          })}
        </MenuList>
        {isLocationAvailable && <LocationRow />}
      </ScrollView>
    </View>
  );
};
