import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { useSettings } from "@/state/settings";
import { View } from "react-native";

/** Rating color dot for an entry, using the user's selected scale. */
export const RatingDot = ({ rating }: { rating: LogItem["rating"] }) => {
  const colors = useColors();
  const { settings } = useSettings();

  const backgroundColor = colors.scales[settings.scaleType][rating].background;

  return (
    <View
      style={{
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 4,
        borderRadius: 6,
        backgroundColor,
        width: 32,
        aspectRatio: 1,
      }}
    />
  );
};
