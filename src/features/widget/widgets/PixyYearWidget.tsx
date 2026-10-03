import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  aspectRatio,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  resizable,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";
import type { YearWidgetProps } from "../widgetProps";

/**
 * Year in pixels, shown as row images the app captured. Runs in the widget
 * runtime: no hooks, no imports besides `@expo/ui`, and no module-scope
 * values. A few images keep the extension far under its 30 MB limit.
 */
const PixyYearWidget = (
  props: YearWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  try {
    // Before the app's first sync the widget gets empty props.
    if (props.light === undefined || props.rowsLight === undefined) {
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
    const isDark = environment.colorScheme === "dark";
    const isLarge = environment.widgetFamily === "systemLarge";
    const scheme = isDark ? props.dark : props.light;
    let rows = isDark ? props.rowsDark : props.rowsLight;
    if (isLarge) {
      rows = isDark ? props.rowsDarkLarge : props.rowsLightLarge;
    }
    // Rows span the full width; zero-minimum spacers between them fill the
    // height. The grid touches all four content edges and cells stay square.
    const stack: ReturnType<typeof Spacer>[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      if (index > 0) {
        stack.push(<Spacer key={`gap-${rows[index]}`} minLength={0} />);
      }
      stack.push(
        <Image
          key={rows[index]}
          uiImage={rows[index]}
          modifiers={[
            resizable(),
            aspectRatio({ contentMode: "fit" }),
            frame({ maxWidth: Infinity }),
          ]}
        />
      );
    }

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
        {rows.length === 0 ? (
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle(scheme.textSecondary),
            ]}
          >
            Open Pixy to fill this widget.
          </Text>
        ) : (
          <VStack
            spacing={0}
            modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}
          >
            {stack}
          </VStack>
        )}
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
