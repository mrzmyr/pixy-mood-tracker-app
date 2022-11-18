import dayjs from "dayjs";
import React from "react";
import { View } from "react-native";
import { DATE_FORMAT } from "../../../constants/Config";
import useColors from "../../../hooks/useColors";
import { useLogState } from "../../../hooks/useLogs";
import useScale from "../../../hooks/useScale";

export const Day = ({ date }) => {
  const colors = useColors();
  const logState = useLogState();
  const item = logState.items[date];
  const scale = useScale();

  return (
    <View
      style={{
        aspectRatio: 1,
        width: '100%',
        borderRadius: 100,
        backgroundColor: item ? scale.colors[item.rating].background : 'transparent',
        borderWidth: 2,
        borderColor: item ? scale.colors[item.rating].background : colors.yearPixelsEmptyDot,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* if date dayjs is today */}
      {dayjs().format(DATE_FORMAT) === date && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 100,
            backgroundColor: item ? colors.cardBackground : colors.yearPixelsEmptyDot,
          }} />
      )}
    </View>
  );
};
