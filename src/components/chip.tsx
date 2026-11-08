import memoize from "lodash/memoize";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { AccessibilityActionEvent, PressableProps } from "react-native";
import * as Reanimated from "react-native-reanimated";
import FlagHighlight from "@/components/flag-highlight";
import { CHIP } from "@/constants/chip";
import type { ChipStyle } from "@/constants/chip";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";

// Built on first render, never at module load: expo-router's Jest mock of
// reanimated is empty. Without reanimated, plain components and no
// transitions. Memoized, so every render gets the same component.
const hasReanimated = () => "createAnimatedComponent" in Reanimated;
// Without reanimated (Jest), components stay plain and ignore transitions.
// SAFETY: the fallback runs only under the empty Jest mock. It returns the
// component unchanged, so its props stay valid; Jest never runs transitions.
const createAnimated = (
  hasReanimated()
    ? Reanimated.createAnimatedComponent
    : <T,>(component: T) => component
) as typeof Reanimated.createAnimatedComponent;
const getAnimatedPressable = memoize(() => createAnimated(Pressable));
const getAnimatedText = memoize(() => createAnimated(Text));
const getAnimatedView = memoize(() => createAnimated(View));
const getTransitions = memoize(() => {
  if (!hasReanimated()) {
    return null;
  }
  const timing = {
    transitionDuration: CHIP.duration,
    transitionTimingFunction: Reanimated.cubicBezier(0.2, 0.8, 0.2, 1),
  };
  return Reanimated.css.create({
    pill: { transitionProperty: ["transform", "backgroundColor"], ...timing },
    label: { transitionProperty: ["color"], ...timing },
    lead: { transitionProperty: ["opacity"], ...timing },
  });
});

type Transitions = ReturnType<typeof getTransitions>;

/** Reduced motion from reanimated; off when reanimated is missing. */
const useIsReducedMotion: () => boolean = hasReanimated()
  ? Reanimated.useReducedMotion
  : () => false;

type ChipA11y = Pick<
  PressableProps,
  | "accessibilityLabel"
  | "accessibilityHint"
  | "accessibilityActions"
  | "onAccessibilityAction"
  | "testID"
>;

const LAYER = {
  position: "absolute",
  inset: 0,
  alignItems: "center",
  justifyContent: "center",
} as const;

/** Start padding: larger markers, like avatars, sit centered in the pill end. */
const getPaddingLeft = (hasLead: boolean, leadSize: number) => {
  if (!hasLead) {
    return CHIP.paddingLeft;
  }
  return leadSize > CHIP.lead
    ? (CHIP.height - leadSize) / 2
    : CHIP.paddingLeftLead;
};

/** Marker box; `selected` crossfades `lead` into `leadSelected`. */
const ChipLead = ({
  lead,
  leadSelected,
  size,
  selected,
  transitions,
}: {
  lead: ReactNode;
  leadSelected?: ReactNode;
  size: number;
  selected: boolean;
  transitions: Transitions;
}) => {
  const AnimatedView = getAnimatedView();
  const hasSelectedLayer = leadSelected !== undefined;

  return (
    <View style={{ width: size, height: size }}>
      {/* oxlint-disable-next-line react/static-components -- memoized above, same component on every render. */}
      <AnimatedView
        style={[
          LAYER,
          { opacity: selected && hasSelectedLayer ? 0 : 1 },
          transitions?.lead,
        ]}
      >
        {lead}
      </AnimatedView>
      {hasSelectedLayer && (
        // oxlint-disable-next-line react/static-components -- memoized above, same component on every render.
        <AnimatedView
          style={[LAYER, { opacity: selected ? 1 : 0 }, transitions?.lead]}
        >
          {leadSelected}
        </AnimatedView>
      )}
    </View>
  );
};

/**
 * Screen reader props. Toggle: checkbox with checked state. Action: button.
 * Read-only: no role. Long press doubles as the "edit" action.
 */
const getA11yProps = ({
  a11y,
  label,
  selected,
  isPressable,
  isToggle,
  onLongPress,
}: {
  a11y: ChipA11y;
  label: string;
  selected: boolean;
  isPressable: boolean;
  isToggle: boolean;
  onLongPress?: () => void;
}): PressableProps => {
  const role = isToggle ? "checkbox" : "button";
  return {
    accessibilityRole: isPressable ? role : undefined,
    accessibilityState:
      isPressable && isToggle ? { checked: selected } : undefined,
    accessibilityLabel: a11y.accessibilityLabel ?? label,
    accessibilityHint: a11y.accessibilityHint,
    accessibilityActions:
      a11y.accessibilityActions ??
      (onLongPress ? [{ name: "edit", label: t("edit") }] : undefined),
    onAccessibilityAction:
      a11y.onAccessibilityAction ??
      (({ nativeEvent }: AccessibilityActionEvent) => {
        if (nativeEvent.actionName === "edit") {
          onLongPress?.();
        }
      }),
    testID: a11y.testID,
  };
};

/**
 * Pill for emotions, tags, and people. Gray idle fill; a selected chip is
 * inverted, or ink with flag `chip-active-ink`. Selection never changes the
 * size: same weight, no extra glyphs.
 *
 * Press scale, fill, label color, and the `lead` to `leadSelected` crossfade
 * share one 160 ms transition, so color and scale move together. Reduced
 * motion switches instantly. Press plays a selection haptic. Long press
 * plays an impact haptic and runs `onLongPress`; screen readers get it as
 * the "edit" action.
 */
export const Chip = ({
  label,
  selected = false,
  lead,
  leadSelected,
  leadSize = CHIP.lead,
  fill = false,
  isToggle = true,
  onPress,
  onLongPress,
  style,
  ...a11y
}: ChipA11y & {
  label: string;
  selected?: boolean;
  /** Marker before the label: emotion icon, tag dot, or avatar. */
  lead?: ReactNode;
  /** Marker while selected; crossfades with `lead`. Without it `lead` stays. */
  leadSelected?: ReactNode;
  /** Marker size. Defaults to the icon box. */
  leadSize?: number;
  /** Stretch to the parent width, label start-aligned. For grid cells. */
  fill?: boolean;
  /** `false` for an action chip, like "Edit": button role, no checked state. */
  isToggle?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ChipStyle;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const isInk = useFeatureFlag("chip-active-ink");
  const isReducedMotion = useIsReducedMotion();
  const [isPressed, setIsPressed] = useState(false);
  const AnimatedPressable = getAnimatedPressable();
  const AnimatedText = getAnimatedText();
  // Reduced motion: no transitions, every change is instant.
  const transitions = isReducedMotion ? null : getTransitions();
  const isPressable = onPress !== undefined;
  const selectedColors = isInk
    ? {
        fill: colors.chipBackgroundSelectedInk,
        text: colors.chipTextSelectedInk,
      }
    : { fill: colors.chipBackgroundSelected, text: colors.chipTextSelected };

  const chip = (
    // oxlint-disable-next-line react/static-components -- memoized above, same component on every render.
    <AnimatedPressable
      disabled={!isPressable && !onLongPress}
      {...getA11yProps({
        a11y,
        label,
        selected,
        isPressable,
        isToggle,
        onLongPress,
      })}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={() => {
        if (onPress) {
          void haptics.selection();
          onPress();
        }
      }}
      onLongPress={
        onLongPress &&
        (() => {
          void haptics.impact();
          onLongPress();
        })
      }
      style={[
        {
          height: CHIP.height,
          flexDirection: "row",
          alignItems: "center",
          alignSelf: fill ? "stretch" : "flex-start",
          gap: CHIP.gap,
          paddingLeft: getPaddingLeft(lead !== undefined, leadSize),
          paddingRight: CHIP.paddingRight,
          borderRadius: RADIUS.full,
          backgroundColor: selected
            ? selectedColors.fill
            : colors.chipBackground,
          transform: [
            { scale: isPressed && isPressable ? CHIP.pressedScale : 1 },
          ],
          ...style,
        },
        transitions?.pill,
      ]}
    >
      {lead !== undefined && (
        <ChipLead
          lead={lead}
          leadSelected={leadSelected}
          size={leadSize}
          selected={selected}
          transitions={transitions}
        />
      )}
      {/* oxlint-disable-next-line react/static-components -- memoized above, same component on every render. */}
      <AnimatedText
        numberOfLines={1}
        style={[
          {
            flexShrink: 1,
            fontSize: CHIP.fontSize,
            lineHeight: CHIP.lineHeight,
            letterSpacing: CHIP.letterSpacing,
            color: selected ? selectedColors.text : colors.chipText,
          },
          transitions?.label,
        ]}
      >
        {label}
      </AnimatedText>
    </AnimatedPressable>
  );

  // Wrap whenever the flag is on, never by `selected`: a changing tree
  // would remount the chip and skip the transition.
  return isInk ? (
    <FlagHighlight flag="chip-active-ink" pillOnly>
      {chip}
    </FlagHighlight>
  ) : (
    chip
  );
};
