import {
  HStack,
  Image,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  aspectRatio,
  clipped,
  containerBackground,
  font,
  foregroundStyle,
  fixedSize,
  frame,
  lineLimit,
  offset,
  padding,
  resizable,
  scaleEffect,
  strokeBorder,
  widgetURL,
  zIndex,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";
import type { WeekWidgetProps } from "../widget-props";

/**
 * This week as seven pixels under a prompt and Cloud Pixy. Pixy looks curious
 * until today's first check-in, then smiles. Today is a lifted pixel with a
 * white border. Runs in the widget runtime: no hooks, no imports besides
 * `@expo/ui`, and no module-scope values.
 */
const PixyWeekWidget = (
  props: WeekWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  try {
    // Before the app's first sync the widget gets empty props.
    if (props.light === undefined || props.days === undefined) {
      return (
        <VStack
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
            containerBackground(
              environment.colorScheme === "dark" ? "#0a1124" : "#a9d4fd",
              "widget"
            ),
          ]}
        >
          <Text modifiers={[font({ size: 13 }), foregroundStyle("#404040")]}>
            Open Pixy to see your pixels.
          </Text>
        </VStack>
      );
    }
    const isDark = environment.colorScheme === "dark";
    const scheme = isDark ? props.dark : props.light;
    const isSmall = environment.widgetFamily === "systemSmall";
    const gap = isSmall ? 4 : 10;
    const radius = isSmall ? 4 : 6;
    const pixySize = isSmall ? 56 : 84;

    const fill = (rating: string, isFuture: boolean, isToday: boolean) => {
      if (rating !== "") {
        // SAFETY: a non-empty rating is a WidgetRating key.
        return scheme.ratings[rating as keyof typeof scheme.ratings];
      }
      if (isToday) {
        return scheme.todayEmpty;
      }
      return isFuture ? scheme.future : scheme.empty;
    };

    const row = (
      <HStack spacing={gap}>
        {props.days.map((cell) => (
          <RoundedRectangle
            key={cell.day}
            cornerRadius={radius}
            modifiers={[
              foregroundStyle(fill(cell.rating, cell.isFuture, cell.isToday)),
              strokeBorder({
                content: cell.isToday ? scheme.today : scheme.edge,
                // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- @expo/ui parameter name
                shape: "roundedRectangle",
                cornerRadius: radius,
                style: { lineWidth: 1 },
              }),
              aspectRatio({ ratio: 1, contentMode: "fit" }),
              // Today lifts off the sky: larger, drawn on top of its neighbors.
              scaleEffect(cell.isToday ? 1.15 : 1),
              zIndex(cell.isToday ? 1 : 0),
            ]}
          />
        ))}
      </HStack>
    );

    const pixy = props.isCheckedIn ? props.pixyHappy : props.pixyCurious;

    // `contentMarginsDisabled` in app.config.ts lets the sky fill the widget
    // edge to edge; the content keeps the system margins as padding.
    const contentPadding = padding(
      environment.widgetContentMargins ?? {
        top: 16,
        bottom: 16,
        leading: 16,
        trailing: 16,
      }
    );
    const sky = isDark ? props.skyDark : props.skyLight;
    // Tinted and clear modes drop the background, so no photo there.
    const isFullColor =
      (environment.widgetRenderingMode ?? "fullColor") === "fullColor";

    return (
      <ZStack
        modifiers={[
          containerBackground(scheme.background, "widget"),
          widgetURL(props.url),
        ]}
      >
        {Boolean(sky) && isFullColor ? (
          <Image
            uiImage={sky}
            modifiers={[
              resizable(),
              aspectRatio({ contentMode: "fill" }),
              // Zero minimums: the photo takes the widget size and never grows it.
              frame({
                minWidth: 0,
                maxWidth: Infinity,
                minHeight: 0,
                maxHeight: Infinity,
              }),
              clipped(),
            ]}
          />
        ) : null}
        <VStack
          alignment="leading"
          spacing={0}
          modifiers={[
            frame({
              maxWidth: Infinity,
              maxHeight: Infinity,
              alignment: "topLeading",
            }),
            contentPadding,
          ]}
        >
          <HStack alignment="top" spacing={4}>
            <Text
              modifiers={[
                font({ size: isSmall ? 14 : 17, weight: "semibold" }),
                foregroundStyle(scheme.text),
                lineLimit(isSmall ? 3 : 2),
                // Wrap onto more lines instead of truncating the first.
                fixedSize({ horizontal: false, vertical: true }),
              ]}
            >
              {props.prompt}
            </Text>
            <Spacer minLength={0} />
            {pixy ? (
              <Image
                uiImage={pixy}
                modifiers={[
                  resizable(),
                  frame({ width: pixySize, height: pixySize }),
                  // Pixy floats into the corner margin, like on the sky. The
                  // negative padding keeps the prompt's width.
                  padding({ trailing: isSmall ? -22 : -24 }),
                  offset({ y: isSmall ? -14 : -18 }),
                ]}
              />
            ) : null}
          </HStack>
          <Spacer minLength={0} />
          {row}
        </VStack>
      </ZStack>
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
