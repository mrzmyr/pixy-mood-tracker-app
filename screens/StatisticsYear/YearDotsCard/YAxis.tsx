import React from "react";
import { Text, View } from "react-native";
import useColors from "../../../hooks/useColors";

export const YAxis = ({ dayCount }) => {
  const colors = useColors();

  return (
    <View
      style={{
        alignItems: 'flex-start',
        justifyContent: 'center',
        width: 25,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: 'bold',
          color: colors.yearPixelsLegendText,
        }}
      >{dayCount}</Text>
    </View>
  );
};
