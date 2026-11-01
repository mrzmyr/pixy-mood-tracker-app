import chroma from "chroma-js";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { useDerivedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { SKY_DRIFT_SPEED, Sky } from "@/components/sky";
import useColors from "@/hooks/use-colors";

/** Fade behind the bottom controls, so text stays readable over clouds. */
const SCRIM_HEIGHT = 260;
/** Extra cloud drift at full voice level, in points per second. */
const SKY_VOICE_SPEED = 32;

/**
 * Voice mode background: the onboarding sky. Clouds speed up while the user
 * talks, so the screen shows Pixy is listening. Reduced motion: still.
 */
export const VoiceBackground = ({ level }: { level: SharedValue<number> }) => {
  const colors = useColors();
  const speed = useDerivedValue(
    () => SKY_DRIFT_SPEED + level.get() * SKY_VOICE_SPEED
  );
  const scrim = chroma(colors.background);

  return (
    <>
      <Sky speed={speed} />
      <LinearGradient
        pointerEvents="none"
        colors={[scrim.alpha(0).css(), scrim.alpha(0.85).css()]}
        locations={[0, 0.55]}
        style={[
          StyleSheet.absoluteFill,
          { top: undefined, height: SCRIM_HEIGHT },
        ]}
      />
    </>
  );
};
