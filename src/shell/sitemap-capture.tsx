import { usePathname } from "expo-router";
import { useEffect } from "react";
import { Keyboard, View } from "react-native";
import { ReduceMotion, ReducedMotionConfig } from "react-native-reanimated";
import { useCalendarFilters } from "@/features/calendar";
import { useFeatureFlag } from "@/state/feature-flags";
import { FEATURE_FLAGS } from "@/state/feature-flags/keys";
import type { FeatureFlag } from "@/state/feature-flags/keys";

// Sitemap capture bundles only (`IS_SITEMAP_CAPTURE`). `bun sitemap capture`
// reads the probe elements below from the accessibility tree and drops every
// `sitemap-*` element before it compares trees. The frozen clock and seeded
// `Math.random` are a Metro polyfill: scripts/sitemap/capture-polyfill.js.

const PROBE_STYLE = {
  height: 1,
  left: 0,
  position: "absolute",
  top: 0,
  width: 1,
} as const;

/** One probe per flag: the label is the state the app applies, `on` or `off`. */
const FlagProbe = ({ flag }: { flag: FeatureFlag }) => {
  const isOn = useFeatureFlag(flag);
  return (
    <View
      accessible
      accessibilityLabel={isOn ? "on" : "off"}
      style={PROBE_STYLE}
      testID={`sitemap-flag-${flag}`}
    />
  );
};

/**
 * Invisible accessibility probes for `bun sitemap capture`: current route,
 * active calendar filter count, and every flag state. They draw no pixels.
 * Also dismisses the keyboard as soon as it shows, so focused fields never
 * draw a keyboard or a blinking caret, and turns reanimated motion off.
 */
export const SitemapProbe = () => {
  const pathname = usePathname();
  const { data } = useCalendarFilters();

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      Keyboard.dismiss();
    });
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View pointerEvents="none" style={PROBE_STYLE}>
      <ReducedMotionConfig mode={ReduceMotion.Always} />
      <View
        accessible
        accessibilityLabel={pathname}
        style={PROBE_STYLE}
        testID="sitemap-route"
      />
      <View
        accessible
        accessibilityLabel={String(data.filterCount)}
        style={PROBE_STYLE}
        testID="sitemap-filters"
      />
      {FEATURE_FLAGS.map((flag) => (
        <FlagProbe flag={flag} key={flag} />
      ))}
    </View>
  );
};
