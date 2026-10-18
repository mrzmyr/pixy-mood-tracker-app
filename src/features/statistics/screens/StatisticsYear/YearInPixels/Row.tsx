import React from "react";

import { View } from "react-native";
import { Day } from "./Day";
import type { YearPixel } from "./yearPixels";
import { YAxis } from "./YAxis";

/** One day-of-month row across all 12 months of the grid. */
export const Row = ({
  dayCount,
  pixels,
  today,
}: {
  dayCount: number;
  /** One pixel per month, January first. */
  pixels: YearPixel[];
  /** Today as `DATE_FORMAT`. */
  today: string;
}) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
    }}
  >
    <YAxis dayCount={dayCount} />
    {pixels.map((pixel) => (
      <View
        key={pixel.date}
        style={{
          alignItems: "center",
          flexBasis: `${100 / 13}%`,
          paddingVertical: 2,
          paddingHorizontal: 4,
        }}
      >
        {pixel.inMonth && (
          <Day rating={pixel.rating} isToday={pixel.date === today} />
        )}
      </View>
    ))}
  </View>
);
