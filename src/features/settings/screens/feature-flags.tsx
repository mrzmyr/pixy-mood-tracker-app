import * as Linking from "expo-linking";
import Check from "lucide-react-native/icons/check";
import { useSyncExternalStore } from "react";
import { ScrollView, View } from "react-native";
import Toggle from "@/components/toggle";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import {
  useFeatureFlagSource,
  useFeatureFlagState,
} from "@/state/feature-flags";
import {
  FEATURE_FLAG_DETAILS,
  FEATURE_FLAGS,
} from "@/state/feature-flags/keys";
import type { FeatureFlag } from "@/state/feature-flags/keys";
import {
  getOverrides,
  isHighlightOn,
  IS_OVERRIDE_BUILD,
  OVERRIDE_ACCESS_FLAG,
  setHighlight,
  setOverride,
  setOverrides,
  subscribe,
} from "@/state/feature-flags/overrides";
import type { FeatureFlagOverride } from "@/state/feature-flags/overrides";

const OVERRIDE_OPTIONS: { value: FeatureFlagOverride; title: string }[] = [
  { value: "remote", title: "PostHog" },
  { value: "on", title: "On" },
  { value: "off", title: "Off" },
];

const OVERRIDABLE_FLAGS = FEATURE_FLAGS.filter(
  (key) => key !== OVERRIDE_ACCESS_FLAG
);

/**
 * The override every flag shares, or `undefined` when flags differ. Drives
 * the check mark of the "All Flags" rows.
 */
const getSharedOverride = (
  overrides: ReturnType<typeof getOverrides>
): FeatureFlagOverride | undefined => {
  const values = new Set(
    OVERRIDABLE_FLAGS.map((flag) => overrides[flag] ?? "remote")
  );
  return values.size === 1 ? [...values][0] : undefined;
};

/** Set every flag to one option in one tap. */
const AllFlagsSection = ({
  shared,
}: {
  shared: FeatureFlagOverride | undefined;
}) => {
  const colors = useColors();

  return (
    <View>
      <MenuListHeadline style={{ marginTop: 8 }}>All Flags</MenuListHeadline>
      <MenuList>
        {OVERRIDE_OPTIONS.map((option) => (
          <MenuListItem
            key={option.value}
            title={option.title}
            onPress={() =>
              setOverrides({ keys: OVERRIDABLE_FLAGS, value: option.value })
            }
            iconRight={
              shared === option.value ? (
                <Check size={18} color={colors.tint} />
              ) : null
            }
            testID={`feature-flag-all-${option.value}`}
          />
        ))}
      </MenuList>
      <TextInfo>Sets every flag below. No check mark: flags differ.</TextInfo>
    </View>
  );
};

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
  const paddingBottom = useScrollBottomPadding(16);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingBottom }}
    >
      <AllFlagsSection shared={getSharedOverride(overrides)} />
      <MenuList>
        <MenuListItem
          title="Highlight flagged features"
          iconRight={
            <Toggle
              accessibilityLabel="Highlight flagged features"
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
