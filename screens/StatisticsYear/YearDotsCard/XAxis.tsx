import dayjs from "dayjs";
import React, { ReactNode } from "react";
import { Text, View } from "react-native";
import useColors from "../../../hooks/useColors";

export const XAxis = () => {
  const months: ReactNode[] = [];
  const colors = useColors();

  for (let i = 0; i < 12; i++) {
    months.push(
      <View
        key={`month-${i}`}
        style={{
          alignItems: 'center',
          flexBasis: `${100 / 13}%`,
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: colors.yearPixelsLegendText,
          }}
        >{dayjs().month(i).format("MMM")[0]}</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          width: 25,
        }}
      >
        <Text>&nbsp;</Text>
      </View>
      {months}
    </View>
  );
};
