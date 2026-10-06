import * as Linking from "expo-linking";
import { Check } from "lucide-react-native";
import { useSyncExternalStore } from "react";
import { ScrollView, View } from "react-native";
import Toggle from "@/components/Toggle";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import useColors from "@/hooks/useColors";
import {
  useFeatureFlagSource,
  useFeatureFlagState,
} from "@/state/featureFlags";
import { FEATURE_FLAG_DETAILS, FEATURE_FLAGS } from "@/state/featureFlags/keys";
import type { FeatureFlag } from "@/state/featureFlags/keys";
import {
  getOverrides,
  isHighlightOn,
  IS_OVERRIDE_BUILD,
  OVERRIDE_ACCESS_FLAG,
  setHighlight,
  setOverride,
  subscribe,
} from "@/state/featureFlags/overrides";
import type { FeatureFlagOverride } from "@/state/featureFlags/overrides";

const OVERRIDE_OPTIONS: { value: FeatureFlagOverride; title: string }[] = [
  { value: "remote", title: "PostHog" },
  { value: "on", title: "On" },
  { value: "off", title: "Off" },
];

const OVERRIDABLE_FLAGS = FEATURE_FLAGS.filter(
  (key) => key !== OVERRIDE_ACCESS_FLAG
);

/** One flag: override options, then what it gates and its state now. */
const FeatureFlagSection = ({
  flag,
  override,
}: {
  flag: FeatureFlag;
  override: "on" | "off" | undefined;
}) => {
  const colors = useColors();
  const state = useFeatureFlagState(flag);
  const source = useFeatureFlagSource(flag);
  const { description, location } = FEATURE_FLAG_DETAILS[flag];

  return (
    <View>
      <MenuListHeadline>{flag}</MenuListHeadline>
      <MenuList>
        {OVERRIDE_OPTIONS.map((option) => (
          <MenuListItem
            key={option.value}
            title={option.title}
            onPress={() => setOverride({ key: flag, value: option.value })}
            iconRight={
              (override ?? "remote") === option.value ? (
                <Check size={18} color={colors.tint} />
              ) : null
            }
            testID={`feature-flag-${flag}-${option.value}`}
          />
        ))}
      </MenuList>
      <TextInfo>
        {`${description}. Shows in: ${location}. Now ${state} (${source === "override" ? "override" : "PostHog"}).`}
      </TextInfo>
    </View>
  );
};

/**
 * Settings > Development > Feature flags: override PostHog flags on this
 * device until the app restarts, and outline flagged UI. Reachable in
 * development and preview builds, and in production while the
 * `feature-flag-overrides` flag is on.
 */
export const FeatureFlagsScreen = () => {
  const colors = useColors();
  const overrides = useSyncExternalStore(subscribe, getOverrides);
  const isHighlighting = useSyncExternalStore(subscribe, isHighlightOn);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1, padding: 16 }}
    >
      <MenuList>
        <MenuListItem
          title="Highlight flagged features"
          iconRight={
            <Toggle
              onValueChange={setHighlight}
              value={isHighlighting}
              testID="feature-flag-highlight"
            />
          }
        />
      </MenuList>
      <TextInfo>
        Outlines UI behind a flag with its key. Amber dot: override. Blue dot:
        PostHog.
      </TextInfo>
      {OVERRIDABLE_FLAGS.map((flag) => (
        <FeatureFlagSection key={flag} flag={flag} override={overrides[flag]} />
      ))}
      <TextInfo>
        {IS_OVERRIDE_BUILD
          ? `Overrides and highlight end when the app restarts. Tests set an override with ${Linking.createURL("dev/feature-flag")}?key=<key>&value=on|off|remote.`
          : "Overrides and highlight end when the app restarts."}
      </TextInfo>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};
