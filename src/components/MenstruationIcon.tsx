import { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Path, Rect } from "react-native-svg";
import useColors from "@/hooks/useColors";
import type { MenstruationFlow } from "@/types";

const FILL_TOP = {
  light: 16,
  medium: 10,
  heavy: 2,
} as const;
const DROPLET_PATH =
  "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z";

/** One 20px droplet encodes flow by fill. Parent supplies the accessible label. */
export const MenstruationIcon = ({ flow }: { flow: MenstruationFlow }) => {
  const colors = useColors();
  const clipId = `menstruation-${useId()}`;
  const color =
    flow === "none" ? colors.menstruationEmpty : colors.menstruationFull;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 20, height: 20 }}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={DROPLET_PATH} />
          </ClipPath>
        </Defs>
        {flow === "spotting" && <Circle cx={12} cy={18} r={1.5} fill={color} />}
        {flow !== "none" && flow !== "spotting" && (
          <Rect
            x={0}
            y={FILL_TOP[flow]}
            width={24}
            height={24 - FILL_TOP[flow]}
            fill={color}
            clipPath={`url(#${clipId})`}
          />
        )}
        <Path
          d={DROPLET_PATH}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};
