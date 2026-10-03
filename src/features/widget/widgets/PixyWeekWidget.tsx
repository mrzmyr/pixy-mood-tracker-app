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
 * module-scope values.
 */
const PixyWeekWidget = (
  props: WeekWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  try {
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

    return (
      <VStack
        alignment="leading"
        spacing={10}
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
                      modifiers={[foregroundStyle(scheme.text)]}
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
