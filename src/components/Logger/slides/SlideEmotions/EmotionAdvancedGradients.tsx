import useColors from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";

export const EmotionAdvancedGradients = () => {
  const colors = useColors();

  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.logBackground, colors.logBackgroundTransparent]}
        style={{
          position: 'absolute',
          height: 12,
          top: 0,
          zIndex: 1,
          width: '100%',
        }} />
      <LinearGradient
        colors={[colors.logBackgroundTransparent, colors.logBackground]}
        style={{
          position: 'absolute',
          height: 32,
          bottom: 0,
          zIndex: 1,
          width: '100%',
        }}
        pointerEvents="none" />
    </>
  );
};
