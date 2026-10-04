import {
  Button,
  HStack,
  Image,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";
import type { CheckInWidgetProps } from "../widgetProps";

/**
 * Seven rating pixels, worst to best, that log a mood without opening the
 * app. A tap runs `onPress` in the widget extension: it appends the tap to
 * `taps` and moves the check mark; the app imports `taps` as entries on its
 * next start or foreground. Runs in the widget runtime: no hooks, no
 * imports besides `@expo/ui`, and no module-scope values.
 */
const PixyCheckInWidget = (
  props: CheckInWidgetProps,
  environment: WidgetEnvironment
) => {
  "widget";
  try {
    // Before the app's first sync the widget gets empty props.
    if (props.light === undefined || props.taps === undefined) {
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
            Open Pixy to log your mood here.
          </Text>
        </VStack>
      );
    }
    const scheme =
      environment.colorScheme === "dark" ? props.dark : props.light;
    if (props.isAvailable === false) {
      return (
        <VStack
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
            containerBackground(scheme.background, "widget"),
            widgetURL(props.url),
          ]}
        >
          <Text
            modifiers={[
              font({ size: 13 }),
              foregroundStyle(scheme.textSecondary),
            ]}
          >
            {props.unavailableText}
          </Text>
        </VStack>
      );
    }

    // Worst to best, left to right. Inline: the runtime has no module scope.
    // oxlint-disable-next-line react-doctor/prefer-module-scope-static-value -- widget layouts are serialized alone; module values do not exist at render.
    const ratings = [
      "extremely_bad",
      "very_bad",
      "bad",
      "neutral",
      "good",
      "very_good",
      "extremely_good",
    ] as const;
    // A second tap this soon replaces the first: fixes a mis-tap without a
    // second entry.
    const replaceWindowMs = 10 * 60 * 1000;

    const logRating = (rating: (typeof ratings)[number]) => {
      const now = Date.now();
      const last = props.taps.at(-1);
      const kept =
        last !== undefined && now - last.at < replaceWindowMs
          ? props.taps.slice(0, -1)
          : props.taps;
      return { selected: rating, taps: [...kept, { rating, at: now }] };
    };

    const label = (text: string) => (
      <Text
        modifiers={[font({ size: 12 }), foregroundStyle(scheme.textSecondary)]}
      >
        {text}
      </Text>
    );

    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity }),
          containerBackground(scheme.background, "widget"),
          widgetURL(props.url),
        ]}
      >
        <HStack spacing={4}>
          <Text
            modifiers={[
              font({ size: 15, weight: "semibold" }),
              foregroundStyle(scheme.text),
            ]}
          >
            {props.title}
          </Text>
          <Spacer />
          {props.reminderTime === "" ? null : (
            <HStack spacing={3}>
              <Image systemName="bell" size={11} color={scheme.textSecondary} />
              {label(props.reminderTime)}
            </HStack>
          )}
        </HStack>
        <Spacer />
        <HStack spacing={6}>
          {ratings.map((rating) => (
            <Button
              key={rating}
              onPress={() => logRating(rating)}
              modifiers={[
                buttonStyle("plain"),
                accessibilityLabel(props.ratingLabels[rating]),
              ]}
            >
              <ZStack modifiers={[frame({ maxWidth: Infinity, height: 40 })]}>
                <RoundedRectangle
                  cornerRadius={10}
                  modifiers={[foregroundStyle(scheme.ratings[rating])]}
                />
                {props.selected === rating ? (
                  <Image
                    systemName="checkmark"
                    size={15}
                    color={scheme.ratingTexts[rating]}
                  />
                ) : null}
              </ZStack>
            </Button>
          ))}
        </HStack>
        <Spacer />
        <HStack>
          {label(props.ratingLabels.extremely_bad)}
          <Spacer />
          {label(props.ratingLabels.neutral)}
          <Spacer />
          {label(props.ratingLabels.extremely_good)}
        </HStack>
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

/** Check-in widget. The name must match `WIDGETS` in app.config.ts. */
export default createWidget<CheckInWidgetProps>(
  "PixyCheckIn",
  PixyCheckInWidget
);
