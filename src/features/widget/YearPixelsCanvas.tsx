import type { Ref } from "react";
import { Text, View } from "react-native";
import type { WidgetSchemeColors, YearDayCode, YearGrid } from "./widgetProps";

/** Width in points of the captured image. Widgets scale it to their width. */
export const YEAR_IMAGE_WIDTH = 340;

/**
 * Week columns in the medium band, ending today. 22 square cells per row
 * leave room for flexible gaps between the 7 rows on every iPhone size.
 */
export const YEAR_BAND_WEEKS = 22;

/** Weekday rows in the medium band, one image each. */
export const YEAR_BAND_ROWS = 7;

/** Month rows in the large widget, one image each. */
export const YEAR_MONTH_ROWS = 3;

const GAP = 2;
const MONTH_GAP = 10;
const MONTH_COLUMNS = 4;
/** Weeks a month can span; shorter months leave the last rows empty. */
const MONTH_WEEKS = 6;
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
 * One row of the year grid, captured as one image. The row has no
 * background: the transparent PNG shows the widget's own background, so the
 * image never draws a mismatched box in dark, tinted, or clear modes. The widget stacks the
 * rows with flexible spacers between them: each row spans the full width,
 * the spacers fill the height, and cells stay square.
 *
 * - `layout: "band"`: weekday `row` (0 to 6) across the trailing
 *   `YEAR_BAND_WEEKS` weeks (medium widget)
 * - `layout: "months"`: months `row * 4` to `row * 4 + 3` as mini calendars
 *   (large widget)
 *
 * Captured with react-native-view-shot, so it must stay mounted and
 * `collapsable={false}`. The parent positions it off screen.
 */
export const YearPixelsCanvas = ({
  grid,
  colors,
  layout,
  row,
  ref,
}: {
  grid: YearGrid;
  colors: WidgetSchemeColors;
  layout: "band" | "months";
  row: number;
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
        }}
      >
        {columns.map((column, offset) => (
          <Cell
            key={offset}
            code={column[row]}
            size={cell}
            isToday={
              grid.today.column === first + offset && grid.today.row === row
            }
            colors={colors}
            gapRight={offset !== count - 1}
            gapBottom={false}
          />
        ))}
      </View>
    );
  }

  const monthWidth =
    (YEAR_IMAGE_WIDTH - (MONTH_COLUMNS - 1) * MONTH_GAP) / MONTH_COLUMNS;
  const cell = (monthWidth - 6 * GAP) / 7;
  const months = grid.months.slice(
    row * MONTH_COLUMNS,
    (row + 1) * MONTH_COLUMNS
  );
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: YEAR_IMAGE_WIDTH,
        flexDirection: "row",
      }}
    >
      {months.map((month, column) => (
        <View
          key={month.label}
          style={{
            width: monthWidth,
            height: 15 + MONTH_WEEKS * cell + (MONTH_WEEKS - 1) * GAP,
            marginRight: column === MONTH_COLUMNS - 1 ? 0 : MONTH_GAP,
          }}
        >
          {/* oxlint-disable-next-line react-doctor/no-tiny-text -- captured at 3x and read inside the widget, never as UI text */}
          <Text
            style={{
              fontSize: 9,
              lineHeight: 12,
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
