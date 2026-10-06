import * as Linking from "expo-linking";
import { Check } from "lucide-react-native";
import { useSyncExternalStore } from "react";
import { ScrollView, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import useColors from "@/hooks/useColors";
import { FEATURE_FLAGS } from "@/state/featureFlags/keys";
import {
  getOverrides,
  IS_OVERRIDE_BUILD,
  OVERRIDE_ACCESS_FLAG,
  setOverride,
  subscribe,
} from "@/state/featureFlags/overrides";
import type { FeatureFlagOverride } from "@/state/featureFlags/overrides";

const OVERRIDE_OPTIONS: { value: FeatureFlagOverride; title: string }[] = [
  { value: "remote", title: "PostHog (needs consent)" },
  { value: "on", title: "On" },
  { value: "off", title: "Off" },
];

const OVERRIDABLE_FLAGS = FEATURE_FLAGS.filter(
  (key) => key !== OVERRIDE_ACCESS_FLAG
);

/**
 * Settings > Development > Feature flags: override PostHog flags on this
 * device until the app restarts. Reachable in development and preview builds,
 * and in production while the `feature-flag-overrides` flag is on.
 */
export const FeatureFlagsScreen = () => {
  const colors = useColors();
  const overrides = useSyncExternalStore(subscribe, getOverrides);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1, padding: 16 }}
    >
      {OVERRIDABLE_FLAGS.map((key) => (
        <View key={key}>
          <MenuListHeadline>{key}</MenuListHeadline>
          <MenuList>
            {OVERRIDE_OPTIONS.map((option) => (
              <MenuListItem
                key={option.value}
                title={option.title}
                onPress={() => setOverride({ key, value: option.value })}
                iconRight={
                  (overrides[key] ?? "remote") === option.value ? (
                    <Check size={18} color={colors.tint} />
                  ) : null
                }
                testID={`feature-flag-${key}-${option.value}`}
              />
            ))}
          </MenuList>
        </View>
      ))}
      <TextInfo>
        {IS_OVERRIDE_BUILD
          ? `Overrides end when the app restarts. Tests set one with ${Linking.createURL("dev/feature-flag")}?key=<key>&value=on|off|remote.`
          : "Overrides end when the app restarts."}
      </TextInfo>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};
