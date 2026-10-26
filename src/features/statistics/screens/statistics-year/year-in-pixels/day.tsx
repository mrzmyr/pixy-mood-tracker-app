import { useSetting } from "@/state/settings";
import React from "react";
import { View } from "react-native";
import useColors from "@/hooks/use-colors";
import type { LogItem } from "@/features/logs";
import useScale from "@/hooks/use-scale";
import { RADIUS } from "@/constants/radius";

/**
 * One pixel in the year grid; `null` ratings render an empty ring and
 * today gets a marker.
 */
export const Day = ({
  rating,
  isToday,
}: {
  rating: LogItem["rating"] | null;
  isToday: boolean;
}) => {
  const colors = useColors();
  const scaleType = useSetting("scaleType");
  const scale = useScale(scaleType);

  return (
    <View
      style={{
        aspectRatio: 1,
        width: "100%",
        borderRadius: RADIUS.full,
        backgroundColor: rating
          ? scale.colors[rating].background
          : "transparent",
        borderWidth: 2,
        borderColor: rating
          ? scale.colors[rating].background
          : colors.yearPixelsEmptyDot,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {isToday && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: RADIUS.full,
            backgroundColor: rating
              ? colors.cardBackground
              : colors.yearPixelsEmptyDot,
          }}
        />
      )}
    </View>
  );
};
