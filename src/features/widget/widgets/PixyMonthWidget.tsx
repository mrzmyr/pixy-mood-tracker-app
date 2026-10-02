import {
  HStack,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  aspectRatio,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  opacity,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";
import type { MonthWidgetProps } from "../widgetProps";

/**
 * Calendar grid of pixels for the current month. Runs in the widget runtime:
 * no hooks, no imports besides `@expo/ui`, and no module-scope values.
 */
const PixyMonthWidget = (
  props: MonthWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  const scheme = environment.colorScheme === "dark" ? props.dark : props.light;
  const isSmall = environment.widgetFamily === "systemSmall";
  const cellSpacing = isSmall ? 3 : 5;
  const titleSize = isSmall ? 12 : 14;

  return (
    <VStack
      alignment="leading"
      spacing={isSmall ? 4 : 6}
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
            font({ size: titleSize, weight: "semibold" }),
            foregroundStyle(scheme.text),
          ]}
        >
          {props.title}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: isSmall ? 10 : 12 }),
            foregroundStyle(scheme.textSecondary),
          ]}
        >
          {props.subtitle}
        </Text>
      </HStack>
      {isSmall ? null : (
        <HStack spacing={cellSpacing}>
          {props.weekdays.map((label, index) => (
            <Text
              key={label + index}
              modifiers={[
                frame({ maxWidth: Infinity }),
                font({ size: 9 }),
                foregroundStyle(scheme.textSecondary),
              ]}
            >
              {label}
            </Text>
          ))}
        </HStack>
      )}
      <VStack spacing={cellSpacing}>
        {props.weeks.map((week, weekIndex) => (
          <HStack key={weekIndex} spacing={cellSpacing}>
            {week.map((cell, dayIndex) => {
              if (cell.day === 0) {
                return (
                  <RoundedRectangle
                    key={`pad${dayIndex}`}
                    cornerRadius={3}
                    modifiers={[
                      aspectRatio({ ratio: 1, contentMode: "fit" }),
                      opacity(0),
                    ]}
                  />
                );
              }
              let fill = scheme.empty;
              if (cell.rating !== "") {
                fill = scheme.ratings[cell.rating];
              } else if (cell.isFuture) {
                fill = scheme.future;
              }
              return (
                <ZStack
                  key={cell.day}
                  modifiers={[aspectRatio({ ratio: 1, contentMode: "fit" })]}
                >
                  {cell.isToday ? (
                    <RoundedRectangle
                      cornerRadius={4}
                      modifiers={[foregroundStyle(scheme.text)]}
                    />
                  ) : null}
                  <RoundedRectangle
                    cornerRadius={cell.isToday ? 2 : 4}
                    modifiers={[
                      foregroundStyle(fill),
                      padding({ all: cell.isToday ? 1.5 : 0 }),
                    ]}
                  />
                </ZStack>
              );
            })}
          </HStack>
        ))}
      </VStack>
      <Spacer />
    </VStack>
  );
};

/** Month widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<MonthWidgetProps>("PixyMonth", PixyMonthWidget);
