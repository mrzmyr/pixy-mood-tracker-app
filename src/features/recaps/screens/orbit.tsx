import dayjs from "dayjs";
import { Stack } from "expo-router";
import { useState } from "react";
import {
  Platform,
  ScrollView,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import { Copy, Label } from "@/components/typography";
import { SPACE } from "@/constants/space";
import { usePeopleState } from "@/features/people";
import type { Person } from "@/features/people";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { t } from "@/lib/translation";
import { connectedPeople } from "../cards/summaries";
import { RingedAvatar } from "../components/ringed-avatar";
import { daysBetween } from "../days";
import { formatAgo, lastConnected } from "../last-connected";
import { OrbitSystem } from "../story/orbit";
import type { SlideContext } from "../story/slides";
import { THRESHOLDS } from "../thresholds";
import { useRecapInput } from "../use-recap-input";
import type { DateKey, Period } from "../types";

const AVATAR = 32;

// Android renders only image icons in the header; iOS uses SF Symbols.
const FILTER_ICON =
  Platform.OS === "ios"
    ? "line.3.horizontal.decrease"
    : require("../../../../assets/images/icons/filter.png");

/** The last `count` days, today included. */
const lastDays = (count: number): Period => {
  const today = dayjs();
  return {
    kind: "month",
    start: today.subtract(count - 1, "day").format("YYYY-MM-DD"),
    end: today.format("YYYY-MM-DD"),
  };
};

type OrbitRange = "30-days" | "90-days" | "12-months";

const RANGES: {
  range: OrbitRange;
  label: () => string;
  period: () => Period;
}[] = [
  {
    range: "30-days",
    label: () => t("orbit_range_30_days"),
    period: () => lastDays(30),
  },
  {
    range: "90-days",
    label: () => t("orbit_range_90_days"),
    period: () => lastDays(90),
  },
  {
    range: "12-months",
    label: () => t("orbit_range_12_months"),
    period: () => ({
      kind: "year",
      start: dayjs().subtract(12, "month").add(1, "day").format("YYYY-MM-DD"),
      end: dayjs().format("YYYY-MM-DD"),
    }),
  },
];

interface OrbitRow {
  days: number;
  date: DateKey;
}

const byDays = (a: OrbitRow, b: OrbitRow) => b.days - a.days;
const byLatest = (a: OrbitRow, b: OrbitRow) => b.date.localeCompare(a.date);

/** What every row shows, and the sort order of rows and orbit. */
type OrbitMode = "last-connected" | "days";

/**
 * One person with their last connected day or their connected days in the
 * range, per `mode`. A tap switches the mode of the whole page.
 */
const PersonRow = ({
  person,
  days,
  ago,
  mode,
  onPress,
}: {
  person: Person;
  days: number;
  ago: string;
  mode: OrbitMode;
  onPress: () => void;
}) => {
  const colors = useColors();
  const value =
    mode === "days" ? t("recaps_story_people_days", { count: days }) : ago;
  return (
    <MenuListItem
      title={person.name}
      iconLeft={<RingedAvatar person={person} size={AVATAR} />}
      iconRight={
        <Label
          size={14}
          style={{
            color: colors.textSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {value}
        </Label>
      }
      onPress={onPress}
      accessibilityValue={{ text: value }}
      testID={`orbit-person-${person.id}`}
    />
  );
};

/**
 * Settings > Orbit: the people of a time range around the user, as in the
 * month recap story. A tap on a person shows their days. Below: everyone
 * connected in that range. Rows show the last connected day, latest first,
 * or the connected days, most first; a tap on any row switches. Planet size
 * is always connected days; the orbit follows the mode. The header menu
 * picks the range. Counts only, never how the days felt.
 */
export const OrbitScreen = () => {
  const [range, setRange] = useState<OrbitRange>("30-days");
  const [mode, setMode] = useState<OrbitMode>("last-connected");
  const selected = RANGES.find((option) => option.range === range) ?? RANGES[0];
  const period = selected.period();
  const input = useRecapInput(period);
  const { people } = usePeopleState();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { width: screen } = useWindowDimensions();
  const paddingBottom = useScrollBottomPadding(24);
  const ctx: SlideContext = {
    period,
    days: input.days,
    history: input.history,
    today: input.today,
    tags: new Map(input.tags.map((tag) => [tag.id, tag])),
    people: new Map(people.map((person) => [person.id, person])),
    isDark: colorScheme === "dark",
  };
  const last = lastConnected(input.days);
  const rows = connectedPeople(input).flatMap(({ personId, days }) => {
    const person = ctx.people.get(personId);
    const date = last.get(personId);
    return person && date
      ? [{ personId, person, days, date, ago: formatAgo(date, input.today) }]
      : [];
  });
  rows.sort(
    mode === "days"
      ? (a, b) => byDays(a, b) || byLatest(a, b)
      : (a, b) => byLatest(a, b) || byDays(a, b)
  );
  const lastDates = new Map(rows.map((row) => [row.personId, row.date]));
  const span = Math.max(1, daysBetween(period.start, period.end));
  // Last connected mode: today on the inner orbit, the range start outside.
  const closeness =
    mode === "last-connected"
      ? (personId: string) =>
          1 -
          daysBetween(lastDates.get(personId) ?? period.start, input.today) /
            span
      : undefined;
  const toggleMode = () =>
    setMode((current) => (current === "days" ? "last-connected" : "days"));
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: SPACE.sm,
          paddingHorizontal: SPACE.lg,
          paddingBottom,
          gap: SPACE.xxl,
        }}
        testID="orbit-screen"
      >
        {rows.length === 0 ? (
          <Copy size={16} testID="orbit-empty">
            {t("orbit_empty")}
          </Copy>
        ) : (
          <>
            <OrbitSystem
              // New range or mode: people swing in again.
              key={`${range}-${mode}`}
              people={rows.slice(0, THRESHOLDS.storyOrbitMaxPeople)}
              ctx={ctx}
              width={screen - 2 * SPACE.lg}
              delay={0}
              closeness={closeness}
            />
            <MenuList>
              {rows.map(({ person, days, ago }) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  days={days}
                  ago={ago}
                  mode={mode}
                  onPress={toggleMode}
                />
              ))}
            </MenuList>
          </>
        )}
      </ScrollView>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon={FILTER_ICON}
          accessibilityLabel={t("orbit_range")}
        >
          {RANGES.map((option) => (
            <Stack.Toolbar.MenuAction
              key={option.range}
              isOn={option.range === range}
              onPress={() => setRange(option.range)}
            >
              {option.label()}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </View>
  );
};
