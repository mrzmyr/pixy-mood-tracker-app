import type { Ref } from "react";
import { Text, View } from "react-native";
import type { WidgetSchemeColors, YearDayCode, YearGrid } from "./widgetProps";

/** Width in points of the captured image. Widgets scale it to their width. */
export const YEAR_IMAGE_WIDTH = 340;

/**
 * Week columns in the medium band, ending today. 25 keeps the band wide
 * enough that the image is always width-bound in the medium widget, so it
 * spans the full content width with the same side padding as the title.
 */
export const YEAR_BAND_WEEKS = 25;
const GAP = 2;
const MONTH_GAP = 10;
const MONTH_ROW_GAP = 26;
const MONTH_COLUMNS = 4;
const RING = 1.5;

const cellFill = (code: YearDayCode, colors: WidgetSchemeColors) => {
  if (code === "p") {
    return "transparent";
  }
  if (code === "") {
    return colors.empty;
  }
  if (code === "f") {
    return colors.future;
  }
  return colors.ratings[code];
};

const Cell = ({
  code,
  size,
  isToday,
  colors,
  gapRight,
  gapBottom,
}: {
  code: YearDayCode;
  size: number;
  isToday: boolean;
  colors: WidgetSchemeColors;
  gapRight: boolean;
  gapBottom: boolean;
}) => (
  <View
    style={{
      width: size,
      height: size,
      marginRight: gapRight ? GAP : 0,
      marginBottom: gapBottom ? GAP : 0,
      borderRadius: Math.max(1, size / 5),
      backgroundColor: cellFill(code, colors),
      borderWidth: isToday ? RING : 0,
      borderColor: colors.today,
    }}
  />
);

/**
 * Year grid for the widget image. `layout: "band"` draws one column per
 * week, seven rows (medium widget). `layout: "months"` draws twelve mini
 * calendars in four columns (large widget). Captured with
 * react-native-view-shot, so it must stay mounted and `collapsable={false}`.
 * The parent positions it off screen.
 */
export const YearPixelsCanvas = ({
  grid,
  colors,
  layout,
  ref,
}: {
  grid: YearGrid;
  colors: WidgetSchemeColors;
  layout: "band" | "months";
  ref: Ref<View>;
}) => {
  if (layout === "band") {
    const last = grid.today.column + 1;
    const first = Math.max(0, last - YEAR_BAND_WEEKS);
    const columns = grid.columns.slice(first, last);
    const count = columns.length;
    const cell = (YEAR_IMAGE_WIDTH - (count - 1) * GAP) / count;
    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: YEAR_IMAGE_WIDTH,
          flexDirection: "row",
          backgroundColor: colors.background,
        }}
      >
        {columns.map((column, offset) => (
          <View key={offset}>
            {column.map((code, row) => (
              <Cell
                key={row}
                code={code}
                size={cell}
                isToday={
                  grid.today.column === first + offset && grid.today.row === row
                }
                colors={colors}
                gapRight={offset !== count - 1}
                gapBottom={row !== 6}
              />
            ))}
          </View>
        ))}
      </View>
    );
  }

  const monthWidth =
    (YEAR_IMAGE_WIDTH - (MONTH_COLUMNS - 1) * MONTH_GAP) / MONTH_COLUMNS;
  const cell = (monthWidth - 6 * GAP) / 7;
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: YEAR_IMAGE_WIDTH,
        flexDirection: "row",
        flexWrap: "wrap",
        backgroundColor: colors.background,
      }}
    >
      {grid.months.map((month, monthIndex) => (
        <View
          key={month.label}
          style={{
            width: monthWidth,
            marginRight:
              monthIndex % MONTH_COLUMNS === MONTH_COLUMNS - 1 ? 0 : MONTH_GAP,
            marginBottom: monthIndex >= 12 - MONTH_COLUMNS ? 0 : MONTH_ROW_GAP,
          }}
        >
          {/* oxlint-disable-next-line react-doctor/no-tiny-text -- captured at 3x and read inside the widget, never as UI text */}
          <Text
            style={{
              fontSize: 9,
              color: colors.textSecondary,
              marginBottom: 3,
            }}
          >
            {month.label}
          </Text>
          {month.weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={{ flexDirection: "row" }}>
              {week.map((code, dayIndex) => {
                const dayNumber =
                  week.slice(0, dayIndex + 1).filter((item) => item !== "p")
                    .length +
                  month.weeks
                    .slice(0, weekIndex)
                    .flat()
                    .filter((item) => item !== "p").length;
                return (
                  <Cell
                    key={dayIndex}
                    code={code}
                    size={cell}
                    isToday={code !== "p" && month.today === dayNumber}
                    colors={colors}
                    gapRight={dayIndex !== 6}
                    gapBottom={weekIndex !== month.weeks.length - 1}
                  />
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};
