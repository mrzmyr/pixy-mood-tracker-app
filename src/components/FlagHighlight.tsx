import { useSyncExternalStore } from "react";
import { Platform, Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import colors from "@/constants/Colors/TailwindColors";
import { RADIUS } from "@/constants/Radius";
import {
  useCanOverrideFeatureFlags,
  useFeatureFlagSource,
} from "@/state/featureFlags/context";
import type { FeatureFlag } from "@/state/featureFlags/keys";
import { isHighlightOn, subscribe } from "@/state/featureFlags/overrides";

const MONO_FONT = Platform.select({ ios: "Menlo", default: "monospace" });

/**
 * Marks UI that a feature flag shows. Never gates: keep the
 * `useFeatureFlag` condition around it. While Settings > Development >
 * Feature flags > Highlight is on, draws a dashed outline and a pill with
 * the flag key. The outline sits inside the children, so layout does not
 * change and clipping lists still show it. The pill dot shows the source:
 * amber for a local override, sky for PostHog. `pillOnly` skips the outline
 * for full screens, such as logger slides.
 */
const FlagHighlight = ({
  flag,
  pillOnly = false,
  style,
  children,
}: {
  flag: FeatureFlag;
  pillOnly?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}) => {
  const source = useFeatureFlagSource(flag);
  const canOverride = useCanOverrideFeatureFlags();
  const isHighlighting = useSyncExternalStore(subscribe, isHighlightOn);

  if (!canOverride || !isHighlighting) {
    return children;
  }

  return (
    <View style={style} testID={`feature-flag-highlight-${flag}`}>
      {children}
      {!pillOnly && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 1,
            right: 1,
            bottom: 1,
            left: 1,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: colors.violet[500],
            borderRadius: RADIUS.md,
          }}
        />
      )}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -1,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderBottomLeftRadius: RADIUS.sm,
            borderBottomRightRadius: RADIUS.sm,
            backgroundColor: colors.violet[500],
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                source === "override" ? colors.amber[400] : colors.sky[400],
            }}
          />
          <Text
            style={{
              color: colors.white,
              fontFamily: MONO_FONT,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {flag}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default FlagHighlight;
