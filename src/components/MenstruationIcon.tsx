import { Droplet } from "lucide-react-native";
import { View } from "react-native";
import useColors from "@/hooks/useColors";
import type { MenstruationFlow } from "@/types";

const DROPLET_COUNTS = {
  none: 1,
  spotting: 0,
  light: 1,
  medium: 2,
  heavy: 3,
} as const;

/** Decorative flow icon. Parent supplies the translated accessible label. */
export const MenstruationIcon = ({ flow }: { flow: MenstruationFlow }) => {
  const colors = useColors();
  const color =
    flow === "none" ? colors.menstruationEmpty : colors.menstruationFull;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 72,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      {flow === "spotting" ? (
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: color,
          }}
        />
      ) : (
        ["first", "second", "third"]
          .slice(0, DROPLET_COUNTS[flow])
          .map((key) => (
            <Droplet
              key={key}
              size={20}
              color={color}
              fill={flow === "none" ? "none" : color}
            />
          ))
      )}
    </View>
  );
};
