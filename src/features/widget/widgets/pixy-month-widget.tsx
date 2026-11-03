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
  opacity,
  padding,
  resizable,
  scaleEffect,
  strokeBorder,
  widgetURL,
  zIndex,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";
import type { MonthWidgetProps, WidgetCell } from "../widget-props";

/**
 * The current month as pixels, rows are weeks. Medium and large add the
 * prompt and Cloud Pixy, who looks curious until today's first check-in and
 * then smiles. Today is a lifted pixel with a white border. Runs in the widget
 * runtime: no hooks, no imports besides `@expo/ui`, and no module-scope
 * values.
 */
const PixyMonthWidget = (
  props: MonthWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  try {
    // Before the app's first sync the widget gets empty props.
    if (props.light === undefined || props.weekdays === undefined) {
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
    const family = environment.widgetFamily;
    const isMedium = family === "systemMedium";
    const isLarge = family === "systemLarge";
    let spacing = 4;
    let radius = 4;
    if (isLarge) {
      spacing = 8;
      radius = 6;
    }

    const fill = (cell: WidgetCell) => {
      if (cell.rating !== "") {
        // SAFETY: a non-empty rating is a WidgetRating key.
        return scheme.ratings[cell.rating as keyof typeof scheme.ratings];
      }
      if (cell.isToday) {
        return scheme.todayEmpty;
      }
      return cell.isFuture ? scheme.future : scheme.empty;
    };

    // Large: every cell fills its column so the weekday letters line up.
    const columnFrame = isLarge ? [frame({ maxWidth: Infinity })] : [];

    const pixel = (cell: WidgetCell, key: string) => {
      if (cell.day === 0) {
        return (
          <RoundedRectangle
            key={key}
            cornerRadius={radius}
            modifiers={[
              aspectRatio({ ratio: 1, contentMode: "fit" }),
              opacity(0),
              ...columnFrame,
            ]}
          />
        );
      }
      return (
        <RoundedRectangle
          key={key}
          cornerRadius={radius}
          modifiers={[
            foregroundStyle(fill(cell)),
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
            ...columnFrame,
          ]}
        />
      );
    };

    const grid = (
      <VStack spacing={spacing}>
        {isLarge ? (
          <HStack spacing={spacing}>
            {props.weekdays.map((letter, index) => (
              <Text
                // oxlint-disable-next-line react-doctor/no-array-index-as-key -- seven fixed weekday columns; letters repeat (T, S), the column never moves
                key={`${letter}${index}`}
                modifiers={[
                  font({ size: 11, weight: "medium" }),
                  foregroundStyle(scheme.textSecondary),
                  frame({ maxWidth: Infinity }),
                ]}
              >
                {letter}
              </Text>
            ))}
          </HStack>
        ) : null}
        {props.weeks.map((week, weekIndex) => (
          <HStack key={weekIndex} spacing={spacing}>
            {week.map((cell, dayIndex) =>
              pixel(cell, cell.day === 0 ? `pad${dayIndex}` : `${cell.day}`)
            )}
          </HStack>
        ))}
      </VStack>
    );

    const pixy = props.isCheckedIn ? props.pixyHappy : props.pixyCurious;
    const pixyImage = (size: number, overhang: number, x: number, y: number) =>
      pixy ? (
        <Image
          uiImage={pixy}
          modifiers={[
            resizable(),
            frame({ width: size, height: size }),
            // Pixy floats into the corner margin, like on the sky. The
            // negative padding keeps the text's width.
            padding({ trailing: -overhang }),
            offset({ x, y }),
          ]}
        />
      ) : null;
    const prompt = (size: number) => (
      <Text
        modifiers={[
          font({ size, weight: "semibold" }),
          foregroundStyle(scheme.text),
          lineLimit(2),
          // Wrap onto a second line instead of truncating the first.
          fixedSize({ horizontal: false, vertical: true }),
        ]}
      >
        {props.prompt}
      </Text>
    );
    const monthName = (
      <Text
        modifiers={[font({ size: 12 }), foregroundStyle(scheme.textSecondary)]}
      >
        {props.title}
      </Text>
    );

    let content = (
      <VStack alignment="leading" spacing={8}>
        <HStack>
          <Text
            modifiers={[
              font({ size: 12, weight: "semibold" }),
              foregroundStyle(scheme.text),
            ]}
          >
            {props.title}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 10 }),
              foregroundStyle(scheme.textSecondary),
            ]}
          >
            {props.subtitle}
          </Text>
        </HStack>
        {grid}
        <Spacer minLength={0} />
      </VStack>
    );
    if (isMedium) {
      content = (
        <HStack alignment="top" spacing={12}>
          <VStack
            alignment="leading"
            spacing={2}
            modifiers={[frame({ maxWidth: 150, alignment: "leading" })]}
          >
            {prompt(16)}
            {monthName}
            <Spacer minLength={0} />
            {pixyImage(72, 0, -8, 10)}
          </VStack>
          <Spacer minLength={0} />
          {grid}
        </HStack>
      );
    } else if (isLarge) {
      content = (
        <VStack alignment="leading" spacing={0}>
          <HStack alignment="top" spacing={4}>
            <VStack alignment="leading" spacing={2}>
              {prompt(18)}
              {monthName}
            </VStack>
            <Spacer minLength={0} />
            {pixyImage(92, 24, 0, -20)}
          </HStack>
          <Spacer minLength={0} />
          {grid}
        </VStack>
      );
    }

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
        <ZStack
          alignment="topLeading"
          modifiers={[
            frame({
              maxWidth: Infinity,
              maxHeight: Infinity,
              alignment: "topLeading",
            }),
            contentPadding,
          ]}
        >
          {content}
        </ZStack>
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

/** Month widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<MonthWidgetProps>("PixyMonth", PixyMonthWidget);
