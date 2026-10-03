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
    const isDark = environment.colorScheme === "dark";
    const scheme = isDark ? props.dark : props.light;
    const image = isDark ? props.imageDark : props.imageLight;

    return (
      <VStack
        alignment="leading"
        spacing={8}
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
              frame({ maxWidth: Infinity }),
            ]}
          />
        )}
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

/** Year widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<YearWidgetProps>("PixyYear", PixyYearWidget);
