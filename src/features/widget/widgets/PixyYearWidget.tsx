import {
  HStack,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  opacity,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";
import type { YearWidgetProps } from "../widgetProps";

/**
 * Year in pixels: one row per month, one cell per day. Runs in the widget
 * runtime: no hooks, no imports besides `@expo/ui`, and no module-scope values.
 */
const PixyYearWidget = (
  props: YearWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  const scheme = environment.colorScheme === "dark" ? props.dark : props.light;
  const isLarge = environment.widgetFamily === "systemLarge";
  const cellSpacing = isLarge ? 3 : 2;

  return (
    <VStack
      alignment="leading"
      spacing={isLarge ? 8 : 6}
      modifiers={[
        frame({
          maxWidth: Infinity,
          maxHeight: Infinity,
          alignment: "topLeading",
        }),
        containerBackground(scheme.background, "widget"),
        widgetURL(props.url),
      ]}
    >
      <HStack>
        <Text
          modifiers={[
            font({ size: 14, weight: "semibold" }),
            foregroundStyle(scheme.text),
          ]}
        >
          {props.title}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 12 }),
            foregroundStyle(scheme.textSecondary),
          ]}
        >
          {props.subtitle}
        </Text>
      </HStack>
      <VStack spacing={cellSpacing}>
        {props.months.map((month, monthIndex) => (
          <HStack key={monthIndex} spacing={cellSpacing}>
            {isLarge ? (
              <Text
                modifiers={[
                  frame({ width: 24, alignment: "leading" }),
                  font({ size: 9 }),
                  foregroundStyle(scheme.textSecondary),
                ]}
              >
                {props.monthLabels[monthIndex]}
              </Text>
            ) : null}
            {month.map((cell, dayIndex) => {
              if (cell === null) {
                return (
                  <RoundedRectangle
                    key={`pad${dayIndex}`}
                    cornerRadius={1.5}
                    modifiers={[
                      frame({ maxWidth: Infinity, maxHeight: Infinity }),
                      opacity(0),
                    ]}
                  />
                );
              }
              let fill = scheme.empty;
              if (cell.rating !== null) {
                fill = scheme.ratings[cell.rating];
              } else if (cell.isFuture) {
                fill = scheme.future;
              }
              return (
                <RoundedRectangle
                  key={cell.day}
                  cornerRadius={1.5}
                  modifiers={[
                    frame({ maxWidth: Infinity, maxHeight: Infinity }),
                    foregroundStyle(cell.isToday ? scheme.text : fill),
                  ]}
                />
              );
            })}
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
};

/** Year widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<YearWidgetProps>("PixyYear", PixyYearWidget);
