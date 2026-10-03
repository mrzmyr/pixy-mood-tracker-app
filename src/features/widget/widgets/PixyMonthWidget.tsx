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
 * Calendar grid of pixels for the current month, rows are weeks. Runs in
 * the widget runtime: no hooks, no imports besides `@expo/ui`, and no
 * module-scope values. Medium puts the title beside the grid because the
 * grid is height-bound.
 */
const PixyMonthWidget = (
  props: MonthWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  try {
    // Before the app's first sync the widget gets empty props.
    if (props.light === undefined || props.weeks === undefined) {
      return (
        <VStack
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
            containerBackground(
              environment.colorScheme === "dark" ? "#171717" : "#FFFFFF",
              "widget"
            ),
          ]}
        >
          <Text modifiers={[font({ size: 13 }), foregroundStyle("#737373")]}>
            Open Pixy to see your pixels.
          </Text>
        </VStack>
      );
    }
    const scheme =
      environment.colorScheme === "dark" ? props.dark : props.light;
    const family = environment.widgetFamily;
    const isSmall = family === "systemSmall";
    const isMedium = family === "systemMedium";
    const cellSpacing = isSmall ? 4 : 5;
    const radius = isSmall ? 4 : 5;

    const cellFill = (rating: string, isFuture: boolean) => {
      if (rating !== "") {
        // SAFETY: a non-empty rating is a WidgetRating key.
        return scheme.ratings[rating as keyof typeof scheme.ratings];
      }
      return isFuture ? scheme.future : scheme.empty;
    };

    const grid = (
      <VStack spacing={cellSpacing}>
        {props.weeks.map((week, weekIndex) => (
          <HStack key={weekIndex} spacing={cellSpacing}>
            {week.map((cell, dayIndex) => {
              if (cell.day === 0) {
                return (
                  <RoundedRectangle
                    key={`pad${dayIndex}`}
                    cornerRadius={radius}
                    modifiers={[
                      aspectRatio({ ratio: 1, contentMode: "fit" }),
                      opacity(0),
                    ]}
                  />
                );
              }
              return (
                <ZStack
                  key={cell.day}
                  modifiers={[aspectRatio({ ratio: 1, contentMode: "fit" })]}
                >
                  {cell.isToday ? (
                    <RoundedRectangle
                      cornerRadius={radius}
                      modifiers={[foregroundStyle(scheme.today)]}
                    />
                  ) : null}
                  <RoundedRectangle
                    cornerRadius={cell.isToday ? radius - 2 : radius}
                    modifiers={[
                      foregroundStyle(cellFill(cell.rating, cell.isFuture)),
                      padding({ all: cell.isToday ? 1.5 : 0 }),
                    ]}
                  />
                </ZStack>
              );
            })}
          </HStack>
        ))}
      </VStack>
    );

    const header = (
      <HStack>
        <Text
          modifiers={[
            font({ size: isSmall ? 12 : 14, weight: "semibold" }),
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
    );

    const rootModifiers = [
      frame({
        maxWidth: Infinity,
        maxHeight: Infinity,
        alignment: "topLeading",
      }),
      containerBackground(scheme.background, "widget"),
      widgetURL(props.url),
    ];

    if (isMedium) {
      return (
        <HStack alignment="top" spacing={16} modifiers={rootModifiers}>
          <VStack alignment="leading" spacing={4}>
            <Text
              modifiers={[
                font({ size: 16, weight: "semibold" }),
                foregroundStyle(scheme.text),
              ]}
            >
              {props.title}
            </Text>
            <Text
              modifiers={[
                font({ size: 12 }),
                foregroundStyle(scheme.textSecondary),
              ]}
            >
              {props.subtitle}
            </Text>
            <Spacer />
          </VStack>
          <Spacer />
          {grid}
        </HStack>
      );
    }

    return (
      <VStack
        alignment="leading"
        spacing={isSmall ? 4 : 8}
        modifiers={rootModifiers}
      >
        {header}
        {grid}
        <Spacer />
      </VStack>
    );
  } catch (error) {
    return (
      <Text
        modifiers={[font({ size: 10 })]}
      >{`Pixy widget error: ${String(error)}`}</Text>
    );
  }
};

/** Month widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<MonthWidgetProps>("PixyMonth", PixyMonthWidget);
