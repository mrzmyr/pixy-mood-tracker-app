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
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";
import type { WeekWidgetProps } from "../widgetProps";

/**
 * Grid of the last weeks, seven pixels per row, current week last. Runs in
 * the widget runtime: no hooks, no imports besides `@expo/ui`, and no
 * module-scope values. Medium puts the title beside the grid because the
 * grid is height-bound.
 */
const PixyWeekWidget = (
  props: WeekWidgetProps,
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
    if (props.isAvailable === false) {
      const unavailable =
        environment.colorScheme === "dark" ? props.dark : props.light;
      return (
        <VStack
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
            containerBackground(unavailable.background, "widget"),
            widgetURL(props.url),
          ]}
        >
          <Text
            modifiers={[
              font({ size: 13 }),
              foregroundStyle(unavailable.textSecondary),
            ]}
          >
            {props.unavailableText}
          </Text>
        </VStack>
      );
    }
    const scheme =
      environment.colorScheme === "dark" ? props.dark : props.light;
    const isSmall = environment.widgetFamily === "systemSmall";
    const gap = isSmall ? 4 : 5;
    const radius = isSmall ? 4 : 5;

    const cellFill = (rating: string, isFuture: boolean) => {
      if (rating !== "") {
        // SAFETY: a non-empty rating is a WidgetRating key.
        return scheme.ratings[rating as keyof typeof scheme.ratings];
      }
      return isFuture ? scheme.future : scheme.empty;
    };

    const grid = (
      <VStack spacing={gap}>
        {props.weeks.map((week, weekIndex) => (
          <HStack key={weekIndex} spacing={gap}>
            {week.map((cell) => (
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
                    padding({ all: cell.isToday ? 2 : 0 }),
                  ]}
                />
              </ZStack>
            ))}
          </HStack>
        ))}
      </VStack>
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

    if (!isSmall) {
      return (
        <HStack alignment="top" spacing={16} modifiers={rootModifiers}>
          <VStack alignment="leading" spacing={4}>
            <Text
              modifiers={[
                font({ size: 15, weight: "semibold" }),
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
      <VStack alignment="leading" spacing={10} modifiers={rootModifiers}>
        <HStack>
          <Text
            modifiers={[
              font({ size: 15, weight: "semibold" }),
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

/** Week widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<WeekWidgetProps>("PixyWeek", PixyWeekWidget);
