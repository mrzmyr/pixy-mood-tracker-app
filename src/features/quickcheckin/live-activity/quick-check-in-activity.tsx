import {
  Button,
  Circle,
  HStack,
  Image,
  Link,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  activityBackgroundTint,
  aspectRatio,
  background,
  buttonStyle,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI modifier name from @expo/ui.
  clipShape,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  privacySensitive,
  resizable,
  strokeBorder,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";
import type { ActivityItem, QuickCheckInActivityProps } from "./activity-props";

/**
 * Lock Screen and Dynamic Island check-in, after the concept prototype
 * (P1, B1): dark card, Pixy mark, Today strip, mood pixels, ranked chips
 * plus More per step. Runs in the widget runtime: no hooks, no imports
 * besides `@expo/ui`, no module-scope values. Every label and data color
 * comes in through props; `rows` arrive already wrapped.
 */
// oxlint-disable-next-line react-doctor/no-giant-component -- the widget runtime gets only this function, so its parts cannot live in other components.
const QuickCheckInActivity = (props: QuickCheckInActivityProps) => {
  "widget";
  const white = "#FFFFFF";
  const muted = "#FFFFFF8C";

  // App icon: four dots in the brand colors.
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- the widget runtime gets only this function; module scope does not exist there.
  const mark = (size: number) => {
    const dot = size * 0.42;
    const gap = size * 0.16;
    const cell = (color: string) => (
      <Circle
        modifiers={[frame({ width: dot, height: dot }), foregroundStyle(color)]}
      />
    );
    return (
      <VStack spacing={gap}>
        <HStack spacing={gap}>
          {cell("#FDBA74")}
          {cell("#34D399")}
        </HStack>
        <HStack spacing={gap}>
          {cell("#FFEDD5")}
          {cell("#059669")}
        </HStack>
      </VStack>
    );
  };

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- the widget runtime gets only this function; module scope does not exist there.
  const strip = (colors: string[], size: number) => (
    <HStack spacing={3}>
      {colors.map((color, index) => (
        <RoundedRectangle
          // oxlint-disable-next-line react-doctor/no-array-index-as-key -- one cell per entry in time order; cells never reorder.
          key={index}
          cornerRadius={3}
          modifiers={[
            frame({ width: size, height: size }),
            foregroundStyle(color),
          ]}
        />
      ))}
    </HStack>
  );

  const title =
    props.step === "done" ? (
      <HStack spacing={6}>
        <Image systemName="checkmark.circle.fill" size={16} color="#34C759" />
        <Text
          modifiers={[
            font({ size: 15, weight: "semibold" }),
            foregroundStyle(white),
            lineLimit(1),
          ]}
        >
          {props.doneTitle}
        </Text>
      </HStack>
    ) : (
      <Text
        modifiers={[
          font({ size: 14, weight: "semibold" }),
          foregroundStyle(white),
          lineLimit(1),
        ]}
      >
        {props.question}
      </Text>
    );

  const header = (
    <HStack spacing={8}>
      {props.step === "done" ? null : mark(14)}
      {title}
      <Spacer />
      {strip(props.today, 9)}
    </HStack>
  );

  const moodRow = (
    <HStack spacing={5}>
      {props.moods.map((mood) => (
        <Button
          key={mood.target}
          target={mood.target}
          modifiers={[buttonStyle("plain")]}
        >
          <RoundedRectangle
            cornerRadius={8}
            modifiers={[
              aspectRatio({ ratio: 1, contentMode: "fit" }),
              frame({ maxWidth: Infinity }),
              foregroundStyle(mood.color),
            ]}
          />
        </Button>
      ))}
    </HStack>
  );

  const chip = (item: ActivityItem) => {
    let icon: React.JSX.Element | null = null;
    if (item.image !== "") {
      // Faces identify people as much as names: redacted while locked.
      icon = (
        <Image
          uiImage={`${props.imageDirectory}${item.image}`}
          modifiers={[
            resizable(),
            frame({ width: 18, height: 18 }),
            // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI modifier name from @expo/ui.
            clipShape("circle"),
            privacySensitive(true),
          ]}
        />
      );
    } else if (item.isPerson) {
      icon = (
        <Image
          systemName="person.fill"
          size={10}
          color={item.isSelected ? "#52525B" : "#A1A1AA"}
        />
      );
    } else if (item.dot !== "") {
      icon = (
        <Circle
          modifiers={[
            frame({ width: 8, height: 8 }),
            foregroundStyle(item.dot),
          ]}
        />
      );
    }
    return (
      <Button
        key={item.target}
        target={item.target}
        modifiers={[buttonStyle("plain")]}
      >
        <HStack
          spacing={6}
          modifiers={[
            padding({ horizontal: 10, vertical: 6 }),
            background(item.isSelected ? white : "#FFFFFF1F"),
            cornerRadius(16),
          ]}
        >
          {icon}
          <Text
            modifiers={[
              font({ size: 13, weight: "medium" }),
              foregroundStyle(item.isSelected ? "#0A0A0A" : white),
              lineLimit(1),
              privacySensitive(item.isPrivate),
            ]}
          >
            {item.label}
          </Text>
        </HStack>
      </Button>
    );
  };

  // The border sits on the stack, not on the Text: Text applies its
  // modifiers twice, which drew two dashed rings.
  const more = (item: ActivityItem) => (
    <Link key="more" destination={props.moreUrl}>
      <HStack
        modifiers={[
          padding({ horizontal: 10, vertical: 6 }),
          strokeBorder({
            content: "#FFFFFF66",
            style: { lineWidth: 1, dash: [3, 3] },
            // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI parameter name from @expo/ui.
            shape: "capsule",
          }),
        ]}
      >
        <Text
          modifiers={[
            font({ size: 13, weight: "medium" }),
            foregroundStyle("#FFFFFFD9"),
            lineLimit(1),
          ]}
        >
          {item.label}
        </Text>
      </HStack>
    </Link>
  );

  const action = (item: ActivityItem) => (
    <Button
      key={item.target}
      target={item.target}
      modifiers={[buttonStyle("plain")]}
    >
      <HStack
        modifiers={[
          padding({ horizontal: 16, vertical: 6 }),
          background(white),
          cornerRadius(16),
        ]}
      >
        <Text
          modifiers={[
            font({ size: 13, weight: "bold" }),
            foregroundStyle("#0A0A0A"),
            lineLimit(1),
          ]}
        >
          {item.label}
        </Text>
      </HStack>
    </Button>
  );

  const rowsView = (list: ActivityItem[][]) => (
    <VStack alignment="leading" spacing={6}>
      {list.map((row, rowIndex) => (
        // oxlint-disable-next-line react-doctor/no-array-index-as-key -- rows are rebuilt from props on every update; there is no row identity.
        <HStack key={rowIndex} spacing={6}>
          {row.map((item) => {
            if (item.kind === "more") {
              return more(item);
            }
            if (item.kind === "action") {
              return (
                <HStack key={item.target} spacing={0}>
                  <Spacer />
                  {action(item)}
                </HStack>
              );
            }
            return chip(item);
          })}
          <Spacer />
        </HStack>
      ))}
    </VStack>
  );

  // The Dynamic Island is lower than the Lock Screen card: it keeps the
  // first row and the row with More and the action.
  const last = props.rows.at(-1);
  const islandRows =
    props.rows.length > 2 && last ? [props.rows[0], last] : props.rows;

  let body = rowsView(props.rows);
  let islandBody = rowsView(islandRows);
  if (props.step === "mood") {
    body = moodRow;
    islandBody = moodRow;
  }
  if (props.step === "done") {
    body = (
      <Text
        modifiers={[
          font({ size: 12 }),
          foregroundStyle(muted),
          lineLimit(1),
          privacySensitive(true),
        ]}
      >
        {props.doneDetail}
      </Text>
    );
    islandBody = body;
  }

  const compactTrailing =
    props.today.length === 0 ? (
      <Text
        modifiers={[
          font({ size: 13, weight: "medium" }),
          foregroundStyle(muted),
        ]}
      >
        Pixy
      </Text>
    ) : (
      strip(props.today.slice(-4), 8)
    );

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={10}
        modifiers={[
          padding({ horizontal: 14, vertical: 12 }),
          activityBackgroundTint("#18181BDB"),
        ]}
      >
        {header}
        {body}
      </VStack>
    ),
    compactLeading: mark(14),
    compactTrailing,
    minimal: mark(14),
    expandedLeading: (
      <HStack modifiers={[padding({ leading: 10, top: 4 })]}>{mark(14)}</HStack>
    ),
    expandedTrailing: (
      <HStack modifiers={[padding({ trailing: 12, top: 4 })]}>
        {strip(props.today, 9)}
      </HStack>
    ),
    expandedBottom: (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[padding({ horizontal: 6, bottom: 6 })]}
      >
        {title}
        {islandBody}
      </VStack>
    ),
  };
};

/**
 * Lock Screen check-in. The name must stay `PixyQuickCheckIn`: running Live
 * Activities find their layout by it after an app update.
 */
export default createLiveActivity<QuickCheckInActivityProps>(
  "PixyQuickCheckIn",
  QuickCheckInActivity
);
