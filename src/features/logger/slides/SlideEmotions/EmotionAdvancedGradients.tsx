import useColors from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Fade at the bottom edge of the advanced emotion list. Must render inside
 * a positioned parent.
 */
export const EmotionAdvancedGradients = () => {
  const colors = useColors();

  return (
    <LinearGradient
      colors={[colors.logBackgroundTransparent, colors.logBackground]}
      style={{
        position: "absolute",
        height: 32,
        bottom: 0,
        zIndex: 1,
        width: "100%",
      }}
      pointerEvents="none"
    />
  );
};
