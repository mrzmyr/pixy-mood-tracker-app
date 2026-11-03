import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { Person } from "@/features/people";
import { t } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import { indexDays } from "../day-index";
import { MonthGrid, StoryText, useDayColors } from "./parts";
import type { SlideContext } from "./slides";
import { getStoryTheme, STORY_PALETTE } from "./theme";

const GAP = 8;
const AVATAR = 44;

/**
 * One person's month from the orbit: the days connected with them in mood
 * color, every other day as empty glass. A tap anywhere goes back to the
 * orbit. Fills the orbit's square, so the slide keeps its layout.
 */
export const OrbitPersonMonth = ({
  person,
  days,
  width,
  ctx,
  onClose,
}: {
  person: Person;
  /** Days connected with `person` in the period. */
  days: number;
  width: number;
  ctx: SlideContext;
  onClose: () => void;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const at = indexDays(ctx.days);
  const connected = ctx.days.filter((day) => at(day).people.has(person.id));
  const dayColors = useDayColors(connected, "glass");
  const dayOutlines = useDayColors(connected, "glassEdge");
  const cell = Math.floor((width - GAP * 6) / 7);
  const count = t("recaps_story_people_days", { count: days });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${person.name}, ${count}`}
      accessibilityHint={t("recaps_story_orbit_back")}
      onPress={onClose}
      testID="recap-story-orbit-person"
      style={{ width, height: width }}
    >
      <Animated.View entering={FadeIn.duration(300)} style={{ gap: 20 }}>
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
          gap={GAP}
          empty={palette.glass}
          emptyOutline={palette.glassBorder}
          weekdayColor={palette.muted}
        />
      </Animated.View>
    </Pressable>
  );
};
