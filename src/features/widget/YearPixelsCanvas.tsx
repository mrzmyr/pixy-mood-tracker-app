import type { Ref } from "react";
import { View } from "react-native";
import type { WidgetSchemeColors, YearDayCode, YearGrid } from "./widgetProps";

/** Width in points of the captured image. Widgets scale it to their width. */
export const YEAR_IMAGE_WIDTH = 340;
const GAP = 1.5;
const BAND_GAP = 10;

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

/**
 * Year grid for the widget image: one column per week, seven rows, split
 * into `bands` stacked blocks so the large widget gets bigger cells.
 * Captured with react-native-view-shot, so it must stay mounted and
 * `collapsable={false}`. The parent positions it off screen.
 */
export const YearPixelsCanvas = ({
  grid,
  colors,
  bands,
  ref,
}: {
  grid: YearGrid;
  colors: WidgetSchemeColors;
  bands: 1 | 2;
  ref: Ref<View>;
}) => {
  const perBand = Math.ceil(grid.columns.length / bands);
  const cell = (YEAR_IMAGE_WIDTH - (perBand - 1) * GAP) / perBand;
  const radius = Math.max(1, cell / 5);
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width: YEAR_IMAGE_WIDTH, backgroundColor: colors.background }}
    >
      {Array.from({ length: bands }, (_, band) => (
        <View
          key={band}
          style={{
            flexDirection: "row",
            marginTop: band === 0 ? 0 : BAND_GAP,
          }}
        >
          {grid.columns
            .slice(band * perBand, (band + 1) * perBand)
            .map((column, columnOffset) => {
              const columnIndex = band * perBand + columnOffset;
              return (
                <View
                  key={columnIndex}
                  style={{
                    marginRight: columnOffset === perBand - 1 ? 0 : GAP,
                  }}
                >
                  {column.map((code, row) => {
                    const isToday =
                      grid.today.column === columnIndex &&
                      grid.today.row === row;
                    return (
                      <View
                        key={row}
                        style={{
                          width: cell,
                          height: cell,
                          marginBottom: row === 6 ? 0 : GAP,
                          borderRadius: radius,
                          backgroundColor: isToday
                            ? colors.text
                            : cellFill(code, colors),
                        }}
                      />
                    );
                  })}
                </View>
              );
            })}
        </View>
      ))}
    </View>
  );
};
