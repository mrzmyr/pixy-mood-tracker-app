import React from "react";
import { View } from "react-native";
import useColors from "@/hooks/use-colors";
import { Label } from "@/components/typography";

/** Day-of-month label at the start of a year grid row. */
export const YAxis = ({ dayCount }) => {
  const colors = useColors();

  return (
    <View
      style={{
        alignItems: "flex-start",
        justifyContent: "center",
        width: 25,
      }}
    >
      <Label
        size={12}
        style={{
          fontWeight: "bold",
          color: colors.yearPixelsLegendText,
        }}
      >
        {dayCount}
      </Label>
    </View>
  );
};
