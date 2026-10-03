import type { Ref } from "react";
import { Text, View } from "react-native";
import type { WidgetSchemeColors, YearGrid } from "./widgetProps";

/** Width in points of the captured image. Widgets scale it to their width. */
export const YEAR_IMAGE_WIDTH = 340;
const LABEL_WIDTH = 26;
const GAP = 2;
const CELL = (YEAR_IMAGE_WIDTH - LABEL_WIDTH - 30 * GAP) / 31;

/**
 * Year grid for the widget image: twelve rows of 31 pixels with month
 * labels. Captured with react-native-view-shot, so it must stay mounted and
 * `collapsable={false}`. The parent positions it off screen.
 */
export const YearPixelsCanvas = ({
  grid,
  colors,
  ref,
}: {
  grid: YearGrid;
  colors: WidgetSchemeColors;
  ref: Ref<View>;
}) => (
  <View
    ref={ref}
    collapsable={false}
    style={{ width: YEAR_IMAGE_WIDTH, backgroundColor: colors.background }}
  >
    {grid.months.map((month, monthIndex) => (
      <View
        key={grid.monthLabels[monthIndex]}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: monthIndex === 11 ? 0 : GAP,
        }}
      >
        {/* oxlint-disable-next-line react-doctor/no-tiny-text -- captured at 3x and read inside the widget, never as UI text */}
        <Text
          style={{
            width: LABEL_WIDTH,
            fontSize: 7,
            color: colors.textSecondary,
          }}
        >
          {grid.monthLabels[monthIndex]}
        </Text>
        {month.map((code, dayIndex) => {
          const isToday =
            grid.today.month === monthIndex && grid.today.day === dayIndex + 1;
          let fill = "transparent";
          if (code !== "p") {
            fill = colors.empty;
            if (code === "f") {
              fill = colors.future;
            } else if (code !== "") {
              fill = colors.ratings[code];
            }
          }
          return (
            <View
              key={dayIndex}
              style={{
                width: CELL,
                height: CELL,
                marginRight: dayIndex === 30 ? 0 : GAP,
                borderRadius: 1.5,
                backgroundColor: isToday ? colors.text : fill,
              }}
            />
          );
        })}
      </View>
    ))}
  </View>
);
