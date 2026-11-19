import dayjs from "dayjs";
import {
  Platform,
  ScrollView,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SKY_DRIFT_SPEED, Sky } from "@/components/sky";
import { usePeopleState } from "@/features/people";
import type { Person } from "@/features/people";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { t } from "@/lib/translation";
import { connectedPeople } from "../cards/summaries";
import { RingedAvatar } from "../components/ringed-avatar";
import { OrbitSystem } from "../story/orbit";
import { StoryText } from "../story/parts";
import type { SlideContext } from "../story/slides";
import {
  getStoryTheme,
  STORY_CARD_RADIUS,
  STORY_PALETTE,
  STORY_SCREEN_PADDING,
} from "../story/theme";
import type { StoryTheme } from "../story/theme";
import { THRESHOLDS } from "../thresholds";
import { useRecapInput } from "../use-recap-input";
import type { Period } from "../types";

/** Days the orbit looks back, today included: the last 4 weeks. */
const ORBIT_DAYS = 28;
const AVATAR = 40;

/** The last `ORBIT_DAYS` days, today included. */
const lastFourWeeks = (): Period => {
  const today = dayjs();
  return {
    kind: "month",
    start: today.subtract(ORBIT_DAYS - 1, "day").format("YYYY-MM-DD"),
    end: today.format("YYYY-MM-DD"),
  };
};

/** One person and their connected days, divider above all but the first. */
const PersonRow = ({
  person,
  days,
  isFirst,
  theme,
}: {
  person: Person;
  days: number;
  isFirst: boolean;
  theme: StoryTheme;
}) => (
  <View
    accessible
    accessibilityLabel={`${person.name}, ${t("recaps_story_people_days", { count: days })}`}
    testID={`orbit-person-${person.id}`}
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: isFirst ? 0 : 1,
      borderTopColor: STORY_PALETTE[theme].glassBorder,
    }}
  >
    <RingedAvatar person={person} size={AVATAR} />
    <View style={{ flex: 1 }}>
      <StoryText kind="label" theme={theme} numberOfLines={1}>
        {person.name}
      </StoryText>
    </View>
    <StoryText
      kind="label"
      theme={theme}
      style={{ fontVariant: ["tabular-nums"] }}
    >
      {days}
    </StoryText>
  </View>
);

/**
 * Settings > Orbit: the people of the last 4 weeks around the user, as in
 * the month recap story, on the sky. A tap on a person shows their days.
 * Below: everyone connected in that time, most connected days first.
 * Counts only, never how the days felt.
 */
export const OrbitScreen = () => {
  const period = lastFourWeeks();
  const input = useRecapInput(period);
  const { people } = usePeopleState();
  const colorScheme = useColorScheme();
  const { width: screen } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const paddingBottom = useScrollBottomPadding(24);
  const speed = useSharedValue(SKY_DRIFT_SPEED);
  const ctx: SlideContext = {
    period,
    days: input.days,
    history: input.history,
    today: input.today,
    tags: new Map(input.tags.map((tag) => [tag.id, tag])),
    people: new Map(people.map((person) => [person.id, person])),
    isDark: colorScheme === "dark",
  };
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const connected = connectedPeople(input);
  const rows = connected.flatMap(({ personId, days }) => {
    const person = ctx.people.get(personId);
    return person ? [{ person, days }] : [];
  });
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Sky speed={speed} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: Platform.OS === "ios" ? 8 : headerHeight + 8,
          paddingHorizontal: STORY_SCREEN_PADDING,
          paddingBottom,
          gap: 24,
        }}
        testID="orbit-screen"
      >
        <StoryText kind="label" theme={theme} tone="muted">
          {t("orbit_period")}
        </StoryText>
        {rows.length === 0 ? (
          <StoryText kind="body" theme={theme} testID="orbit-empty">
            {t("orbit_empty")}
          </StoryText>
        ) : (
          <>
            <OrbitSystem
              people={connected.slice(0, THRESHOLDS.storyOrbitMaxPeople)}
              ctx={ctx}
              width={screen - 2 * STORY_SCREEN_PADDING}
              delay={0}
            />
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 4,
                borderRadius: STORY_CARD_RADIUS,
                borderWidth: 1,
                borderColor: palette.glassBorder,
                backgroundColor: palette.glass,
              }}
            >
              {rows.map(({ person, days }, index) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  days={days}
                  isFirst={index === 0}
                  theme={theme}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};
