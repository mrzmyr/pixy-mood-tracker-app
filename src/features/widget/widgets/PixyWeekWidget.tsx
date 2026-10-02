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
 * Seven pixels for the current week. Runs in the widget runtime: no hooks,
 * no imports besides `@expo/ui`, and no module-scope values (see
 * https://docs.expo.dev/versions/latest/sdk/widgets/#the-widget-directive).
 */
const PixyWeekWidget = (
  props: WeekWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  const scheme = environment.colorScheme === "dark" ? props.dark : props.light;
  const cellSpacing = environment.widgetFamily === "systemSmall" ? 4 : 8;
  const labelSize = environment.widgetFamily === "systemSmall" ? 9 : 11;

  return (
    <VStack
      alignment="leading"
      spacing={6}
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
            font({ size: 13, weight: "semibold" }),
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
      <Spacer />
      <HStack spacing={cellSpacing}>
        {props.days.map((day) => {
          let fill = scheme.empty;
          if (day.rating !== "") {
            fill = scheme.ratings[day.rating];
          } else if (day.isFuture) {
            fill = scheme.future;
          }
          return (
            <VStack key={day.label + day.day} spacing={4}>
              <ZStack
                modifiers={[aspectRatio({ ratio: 1, contentMode: "fit" })]}
              >
                {day.isToday ? (
                  <RoundedRectangle
                    cornerRadius={6}
                    modifiers={[foregroundStyle(scheme.text)]}
                  />
                ) : null}
                <RoundedRectangle
                  cornerRadius={day.isToday ? 4 : 6}
                  modifiers={[
                    foregroundStyle(fill),
                    padding({ all: day.isToday ? 2 : 0 }),
                  ]}
                />
              </ZStack>
              <Text
                modifiers={[
                  font({
                    size: labelSize,
                    weight: day.isToday ? "bold" : "regular",
                  }),
                  foregroundStyle(
                    day.isToday ? scheme.text : scheme.textSecondary
                  ),
                ]}
              >
                {day.label}
              </Text>
            </VStack>
          );
        })}
      </HStack>
    </VStack>
  );
};

/** Week widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<WeekWidgetProps>("PixyWeek", PixyWeekWidget);
