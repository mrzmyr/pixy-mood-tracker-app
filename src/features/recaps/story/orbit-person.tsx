import { use, useEffect, useEffectEvent } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { Person } from "@/features/people";
import { t } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import { indexDays } from "../day-index";
import { daysBetween } from "../days";
import { StoryHoldContext } from "./hold-context";
import { MonthGrid, StoryText, useDayColors } from "./parts";
import type { SlideContext } from "./slides";
import { getStoryTheme, STORY_PALETTE } from "./theme";

const GAP = 8;
/** Most weeks a month can touch. */
const MONTH_WEEKS = 6;
/** Gap of a week column grid, as a share of one cell plus gap. */
const WEEK_COLUMN_GAP = 0.2;
const AVATAR = 44;
/** Grows out of the person: slow enough to follow. */
const OPEN_MS = 450;
/** Back into the person: quick, so the orbit returns at once. */
const CLOSE_MS = 150;
/** Size at the person, as a share of the full month. */
const START_SCALE = 0.15;
/** Today's ring: thin and bright on any sky. */
const TODAY_RING = "#FFFFFF";

/** Where the tapped person sits, relative to the orbit center. */
export interface OrbitOrigin {
  x: number;
  y: number;
}

/**
 * One person's month from the orbit: the days connected with them in mood
 * color, every other day as empty glass, today with a thin bright ring.
 * Grows out of the person (`origin`) and shrinks back into them, faster.
 * A tap on the month or anywhere else on the story goes back to the orbit,
 * never to the next slide. Fills the orbit's square, so the slide keeps
 * its layout. Holds the story while open. A period longer than a month
 * shows one column per week.
 */
export const OrbitPersonMonth = ({
  person,
  days,
  width,
  origin,
  ctx,
  onClose,
}: {
  person: Person;
  /** Days connected with `person` in the period. */
  days: number;
  width: number;
  origin: OrbitOrigin;
  ctx: SlideContext;
  /** After the close animation. */
  onClose: () => void;
}) => {
  const hold = use(StoryHoldContext);
  const isReduced = useReducedMotion();
  const open = useSharedValue(isReduced ? 1 : 0);
  const close = () => {
    hold(false);
    if (isReduced) {
      onClose();
      return;
    }
    open.set(
      withTiming(
        0,
        { duration: CLOSE_MS, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) {
            scheduleOnRN(onClose);
          }
        }
      )
    );
  };
  useEffect(() => {
    if (!isReduced) {
      open.set(
        withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [isReduced, open]);
  // Held while open; a tap outside closes like a tap on the month.
  const onOpen = useEffectEvent(() => hold(true, close));
  useEffect(() => {
    onOpen();
    return () => hold(false);
  }, [hold]);
  const motion = useAnimatedStyle(() => {
    const p = open.get();
    return {
      opacity: p,
      transform: [
        { translateX: origin.x * (1 - p) },
        { translateY: origin.y * (1 - p) },
        { scale: START_SCALE + (1 - START_SCALE) * p },
      ],
    };
  });
  const today =
    ctx.today >= ctx.period.start && ctx.today <= ctx.period.end
      ? ctx.today
      : null;
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const at = indexDays(ctx.days);
  const connected = ctx.days.filter((day) => at(day).people.has(person.id));
  const dayColors = useDayColors(connected, "glass");
  const dayOutlines = useDayColors(connected, "glassEdge");
  // Longer than a month: one column per week, so the year fits the width.
  const weeks = Math.ceil(
    (daysBetween(ctx.period.start, ctx.period.end) + 7) / 7
  );
  const isWeekColumns = weeks > MONTH_WEEKS;
  const unit = width / weeks;
  const gap = isWeekColumns ? unit * WEEK_COLUMN_GAP : GAP;
  const cell = isWeekColumns ? unit - gap : Math.floor((width - GAP * 6) / 7);
  const count = t("recaps_story_people_days", { count: days });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${person.name}, ${count}`}
      accessibilityHint={t("recaps_story_orbit_back")}
      onPress={close}
      testID="recap-story-orbit-person"
      style={{ width, height: width }}
    >
      <Animated.View style={[{ gap: 20 }, motion]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <RingedAvatar person={person} size={AVATAR} />
          <View style={{ flexShrink: 1, gap: 2 }}>
            <StoryText kind="label" theme={theme} numberOfLines={1}>
              {person.name}
            </StoryText>
            <StoryText kind="label" theme={theme} tone="muted">
              {count}
            </StoryText>
          </View>
        </View>
        <MonthGrid
          period={ctx.period}
          dayColors={dayColors}
          dayOutlines={dayOutlines}
          size={cell}
          gap={gap}
          isWeekColumns={isWeekColumns}
          empty={palette.glass}
          emptyOutline={palette.glassBorder}
          weekdayColor={isWeekColumns ? undefined : palette.muted}
          highlight={
            today === null ? undefined : { date: today, color: TODAY_RING }
          }
        />
      </Animated.View>
    </Pressable>
  );
};
