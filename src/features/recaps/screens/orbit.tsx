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
import { formatAgo, lastConnected } from "../last-connected";
import { OrbitSystem } from "../story/orbit";
import type { SlideContext } from "../story/slides";
import { STORY_SCREEN_PADDING } from "../story/theme";
import { THRESHOLDS } from "../thresholds";
import { useRecapInput } from "../use-recap-input";
import type { Period } from "../types";

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

/**
 * One person. Shows when the user last connected with them; a tap toggles
 * to the connected days in the range.
 */
const PersonRow = ({
  person,
  days,
  ago,
}: {
  person: Person;
  days: number;
  ago: string;
}) => {
  const colors = useColors();
  const [isCountShown, setIsCountShown] = useState(false);
  const count = t("recaps_story_people_days", { count: days });
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
          {isCountShown ? count : ago}
        </Label>
      }
      onPress={() => setIsCountShown((shown) => !shown)}
      accessibilityValue={{ text: isCountShown ? count : ago }}
      testID={`orbit-person-${person.id}`}
    />
  );
};

/**
 * Settings > Orbit: the people of a time range around the user, as in the
 * month recap story. A tap on a person shows their days. Below: everyone
 * connected in that range, most connected days first, with the last day
 * connected. The header menu picks the range. Counts only, never how the
 * days felt.
 */
export const OrbitScreen = () => {
  const [range, setRange] = useState<OrbitRange>("30-days");
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
  const connected = connectedPeople(input);
  const last = lastConnected(input.days);
  const rows = connected.flatMap(({ personId, days }) => {
    const person = ctx.people.get(personId);
    const date = last.get(personId);
    return person && date
      ? [{ person, days, ago: formatAgo(date, input.today) }]
      : [];
  });
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: SPACE.sm,
          paddingHorizontal: STORY_SCREEN_PADDING,
          paddingBottom,
          gap: SPACE.xxl,
        }}
        testID="orbit-screen"
      >
        <Label size={14} style={{ color: colors.textSecondary }}>
          {selected.label()}
        </Label>
        {rows.length === 0 ? (
          <Copy size={16} testID="orbit-empty">
            {t("orbit_empty")}
          </Copy>
        ) : (
          <>
            <OrbitSystem
              // New range: people swing in again.
              key={range}
              people={connected.slice(0, THRESHOLDS.storyOrbitMaxPeople)}
              ctx={ctx}
              width={screen - 2 * STORY_SCREEN_PADDING}
              delay={0}
            />
            <MenuList>
              {rows.map(({ person, days, ago }) => (
                <PersonRow
                  // New range: rows show the last day again.
                  key={`${range}-${person.id}`}
                  person={person}
                  days={days}
                  ago={ago}
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
