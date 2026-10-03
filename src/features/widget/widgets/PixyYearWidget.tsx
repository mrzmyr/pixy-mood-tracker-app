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
 * Year in pixels, shown as one image the app captured. Runs in the widget
 * runtime: no hooks, no imports besides `@expo/ui`, and no module-scope
 * values. One image keeps the extension far under its 30 MB limit.
 */
const PixyYearWidget = (
  props: YearWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  try {
    // Before the app's first sync the widget gets empty props.
    if (props.light === undefined || props.imageLight === undefined) {
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
    let image = isDark ? props.imageDark : props.imageLight;
    if (isLarge) {
      image = isDark ? props.imageDarkLarge : props.imageLightLarge;
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
        {image === "" ? (
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle(scheme.textSecondary),
            ]}
          >
            Open Pixy to fill this widget.
          </Text>
        ) : (
          <Image
            uiImage={image}
            modifiers={[
              resizable(),
              aspectRatio({ contentMode: "fit" }),
              frame({
                maxWidth: Infinity,
                maxHeight: Infinity,
                alignment: "top",
              }),
            ]}
          />
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
