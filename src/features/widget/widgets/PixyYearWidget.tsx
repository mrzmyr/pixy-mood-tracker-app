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
 * runtime: no hooks, no imports besides `@expo/ui`, and no module-scope
 * values. Day codes come from `YearWidgetProps.months`.
 */
const PixyYearWidget = (
  props: YearWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  try {
    const scheme =
      environment.colorScheme === "dark" ? props.dark : props.light;
    const isLarge = environment.widgetFamily === "systemLarge";
    const cellSpacing = isLarge ? 3 : 2;
    // Stacks stay under ten children each: 31 days as 8 + 8 + 8 + 7.
    const chunkSize = 8;

    const cellFill = (code: string) => {
      if (code === "") {
        return scheme.empty;
      }
      if (code === "f") {
        return scheme.future;
      }
      // SAFETY: codes other than "", "f", "p" are rating keys (YearDayCode).
      return scheme.ratings[code as keyof typeof scheme.ratings];
    };

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
          {props.months.map((month, monthIndex) => {
            const chunks: string[][] = [];
            for (let start = 0; start < month.length; start += chunkSize) {
              chunks.push(month.slice(start, start + chunkSize));
            }
            return (
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
                {chunks.map((chunk, chunkIndex) => (
                  <HStack key={chunkIndex} spacing={cellSpacing}>
                    {chunk.map((code, index) => {
                      const dayIndex = chunkIndex * chunkSize + index;
                      if (code === "p") {
                        return (
                          <RoundedRectangle
                            key={dayIndex}
                            cornerRadius={1.5}
                            modifiers={[opacity(0)]}
                          />
                        );
                      }
                      const isToday =
                        props.today.month === monthIndex &&
                        props.today.day === dayIndex + 1;
                      return (
                        <RoundedRectangle
                          key={dayIndex}
                          cornerRadius={1.5}
                          modifiers={[
                            foregroundStyle(
                              isToday ? scheme.text : cellFill(code)
                            ),
                          ]}
                        />
                      );
                    })}
                  </HStack>
                ))}
              </HStack>
            );
          })}
        </VStack>
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

/** Year widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<YearWidgetProps>("PixyYear", PixyYearWidget);
