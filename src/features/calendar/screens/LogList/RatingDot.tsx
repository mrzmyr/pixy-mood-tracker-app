import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { useSetting } from "@/state/settings";
import { View } from "react-native";
import { RADIUS } from "@/constants/Radius";

/** Rating color dot for an entry, using the user's selected scale. */
export const RatingDot = ({
  rating,
  size = 32,
}: {
  rating: LogItem["rating"];
  size?: number;
}) => {
  const colors = useColors();
  const scaleType = useSetting("scaleType");

  const backgroundColor = colors.scales[scaleType][rating].background;

  return (
    <View
      style={{
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 4,
        borderRadius: RADIUS.sm,
        backgroundColor,
        width: size,
        aspectRatio: 1,
      }}
    />
  );
};
