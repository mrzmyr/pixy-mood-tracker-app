import dayjs from "dayjs";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Button from "@/components/Button";
import { Caption, Headline, Secondary } from "@/components/Type";
import { RADIUS } from "@/constants/Radius";
import { RATING_MAPPING } from "@/constants/Ratings";
import { EmotionItem } from "@/features/calendar";
import { EMOTIONS } from "@/features/logger";
import type { Person } from "@/features/people";
import { PhotoThumbnail } from "@/features/photos";
import { TagComponent } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t, tDynamic } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import { CHIP } from "../chipMarker";
import { parsePlace } from "../places";
import type {
  ConnectedPerson,
  EmotionCount,
  PeriodKind,
  RecapDay,
  SummaryCard as SummaryCardData,
} from "../types";
import { RecapCardShell } from "./RecapCardShell";
import { RingedAvatar } from "./RingedAvatar";
import { ChipText, EmotionChip } from "./TitleChip";

interface Content {
  art?: ReactNode;
  title: ReactNode;
  titleLabel: string;
  text?: string;
  body?: ReactNode;
  actions?: ReactNode;
}

interface Context {
  history: RecapDay[];
  people: Person[];
  tags: Tag[];
  periodKind: PeriodKind;
}

const EMOTION_BY_KEY = new Map(
  EMOTIONS.map((emotion) => [emotion.key, emotion])
);
const GOOD = new Set(["very_good", "good"]);

const Emotion = ({ emotionKey }: { emotionKey: string }) => {
  const emotion = EMOTION_BY_KEY.get(emotionKey);
  return emotion ? <EmotionItem emotion={emotion} compact /> : null;
};

const Row = ({ children }: { children: ReactNode }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {children}
  </View>
);

const Bar = ({ fraction }: { fraction: number }) => {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        height: 6,
        borderRadius: RADIUS.full,
        backgroundColor: colors.cardBorder,
      }}
    >
      <View
        style={{
          width: `${Math.round(fraction * 100)}%`,
          height: 6,
          borderRadius: RADIUS.full,
          backgroundColor: colors.moduleEmotions,
        }}
      />
    </View>
  );
};

/** Ranked emotions with a bar each, scaled to the top one. */
const Ranked = ({ counts }: { counts: EmotionCount[] }) => {
  const top = counts[0]?.days ?? 1;
  return (
    <View style={{ gap: 10 }}>
      {counts.map((count, index) => (
        <View
          key={count.emotion}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <Caption style={{ width: 18, fontVariant: ["tabular-nums"] }}>
            {index + 1}
          </Caption>
          <Emotion emotionKey={count.emotion} />
          <Bar fraction={count.days / top} />
          <Caption
            style={{
              width: 24,
              textAlign: "right",
              fontVariant: ["tabular-nums"],
            }}
          >
            {count.days}
          </Caption>
        </View>
      ))}
    </View>
  );
};

const emotionLabel = (key: string) => tDynamic(`log_emotion_${key}`);

const emotionsContent = (
  counts: EmotionCount[],
  periodKind: PeriodKind
): Content => {
  if (periodKind === "quarter") {
    const [first, ...rest] = counts;
    const title = t("recaps_emotions_quarter_title", { emotion: CHIP });
    return {
      title: (
        <ChipText
          text={title}
          chip={<EmotionChip emotionKey={first.emotion} />}
        />
      ),
      titleLabel: title.replace(CHIP, emotionLabel(first.emotion)),
      text: t("recaps_emotions_quarter_text", { count: first.days }),
      body: (
        <Row>
          {rest.slice(0, 2).map((count) => (
            <Emotion key={count.emotion} emotionKey={count.emotion} />
          ))}
        </Row>
      ),
    };
  }
  if (periodKind === "week") {
    const title = t("recaps_emotions_title");
    return {
      title,
      titleLabel: title,
      body: (
        <Row>
          {counts.slice(0, 6).map((count) => (
            <Emotion key={count.emotion} emotionKey={count.emotion} />
          ))}
        </Row>
      ),
    };
  }
  const size = periodKind === "year" ? 10 : 3;
  const title =
    periodKind === "year"
      ? t("recaps_emotions_year_title")
      : t("recaps_emotions_title");
  return {
    title,
    titleLabel: title,
    body: <Ranked counts={counts.slice(0, size)} />,
  };
};

const PersonRow = ({
  entry,
  person,
}: {
  entry: ConnectedPerson;
  person: Person;
}) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
    <RingedAvatar person={person} size={44} />
    <View style={{ flex: 1, gap: 4 }}>
      <Headline>{person.name}</Headline>
      <Caption>{t("recaps_connected_days", { count: entry.days })}</Caption>
      {entry.emotions.length > 0 && (
        <Row>
          {entry.emotions.map((emotion) => (
            <Emotion key={emotion} emotionKey={emotion} />
          ))}
        </Row>
      )}
    </View>
  </View>
);

const findPerson = (people: Person[], id: string) =>
  people.find((person) => person.id === id);

const connectedContent = (
  entries: ConnectedPerson[],
  people: Person[]
): Content | null => {
  const known = entries.filter((entry) => findPerson(people, entry.personId));
  const [first] = known;
  if (!first) {
    return null;
  }
  const title =
    known.length === 1
      ? t("recaps_connected_title_one", {
          name: findPerson(people, first.personId)?.name ?? "",
        })
      : t("recaps_connected_title", { count: known.length });
  const rest = known.slice(5);
  return {
    title,
    titleLabel: title,
    body: (
      <View style={{ gap: 16 }}>
        {known.slice(0, 5).map((entry) => {
          const person = findPerson(people, entry.personId);
          return person ? (
            <PersonRow key={entry.personId} entry={entry} person={person} />
          ) : null;
        })}
        {rest.length > 0 && (
          <Secondary>
            {t("recaps_connected_more", { count: rest.length })}
          </Secondary>
        )}
      </View>
    ),
  };
};

const MOST_CONNECTED_TITLES: Partial<Record<PeriodKind, TranslationKey>> = {
  month: "recaps_most_connected_title_month",
  quarter: "recaps_most_connected_title_quarter",
  year: "recaps_most_connected_title_year",
};

/** Second, first, third: the first stands in the middle and tallest. */
const PODIUM_ORDER = [1, 0, 2];

const Podium = ({
  entries,
  people,
}: {
  entries: ConnectedPerson[];
  people: Person[];
}) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "flex-end",
      gap: 16,
    }}
  >
    {PODIUM_ORDER.filter((index) => index < entries.length).map((index) => {
      const entry = entries[index];
      const person = findPerson(people, entry.personId);
      return person ? (
        <View
          key={entry.personId}
          style={{ alignItems: "center", gap: 6, flex: 1 }}
        >
          <RingedAvatar person={person} size={index === 0 ? 84 : 60} />
          <Headline>{person.name}</Headline>
          <Caption>{t("recaps_days", { count: entry.days })}</Caption>
        </View>
      ) : null;
    })}
  </View>
);

const TRIP_TITLES: Partial<Record<PeriodKind, TranslationKey>> = {
  month: "recaps_trips_title_month",
  quarter: "recaps_trips_title_quarter",
  year: "recaps_trips_title_year",
};

const formatRange = (start: string, end: string) =>
  start === end
    ? dayjs(start).format("D MMM")
    : `${dayjs(start).format("D MMM")} – ${dayjs(end).format("D MMM")}`;

const TripDot = () => {
  const colors = useColors();
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: RADIUS.full,
        backgroundColor: colors.moduleLocation,
      }}
    />
  );
};

const BEST_DAY_TITLES: Partial<Record<PeriodKind, TranslationKey>> = {
  week: "recaps_day_best_title_week",
  month: "recaps_day_best_title_month",
};

/** Mood color of the day, or a calm gray block on a harder day. */
const DayBlock = ({ day, hard }: { day: RecapDay; hard: boolean }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const [best] = [...day.items].sort(
    (a, b) => RATING_MAPPING[b.rating] - RATING_MAPPING[a.rating]
  );
  return (
    <View
      style={{
        height: 120,
        borderRadius: RADIUS.md,
        backgroundColor: hard
          ? colors.backgroundSecondary
          : colors.scales[settings.scaleType][best.rating].background,
      }}
    />
  );
};

const DayMedia = ({ day, hard }: { day: RecapDay; hard: boolean }) => {
  const photos = day.items.flatMap((item) => item.photos).slice(0, 3);
  if (photos.length === 0) {
    return <DayBlock day={day} hard={hard} />;
  }
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {photos.map((photo, index) => (
        <View key={photo.id} style={{ flex: 1 }}>
          <PhotoThumbnail
            photo={photo}
            index={index}
            count={photos.length}
            aspectRatio={photos.length === 1 ? 4 / 3 : 3 / 4}
          />
        </View>
      ))}
    </View>
  );
};

const SeeThisDay = ({ date }: { date: string }) => {
  const router = useRouter();
  return (
    <Button
      type="contrast"
      onPress={() =>
        router.push({ pathname: "/days/[date]", params: { date } })
      }
      testID={`recap-see-day-${date}`}
      style={{
        alignSelf: "flex-start",
        borderRadius: RADIUS.md,
        paddingVertical: 12,
        paddingHorizontal: 18,
      }}
    >
      {t("recaps_day_see")}
    </Button>
  );
};

const dayContent = (
  card: Extract<SummaryCardData, { type: "day-recap" }>,
  { history, people, tags, periodKind }: Context
): Content | null => {
  const day = history.find((item) => item.date === card.date);
  if (!day) {
    return null;
  }
  const hard = card.mode === "hard";
  const bestKey = BEST_DAY_TITLES[periodKind];
  if (card.mode === "best" && !bestKey) {
    return null;
  }
  const dayPeople = [
    ...new Set(
      day.items.flatMap((item) => item.people.map((person) => person.id))
    ),
  ].flatMap((id) => findPerson(people, id) ?? []);
  const dayTags = [
    ...new Set(day.items.flatMap((item) => item.tags.map((tag) => tag.id))),
  ].flatMap((id) => tags.find((tag) => tag.id === id) ?? []);
  const goodEmotions = [
    ...new Set(day.items.flatMap((item) => item.emotions)),
  ].filter((key) => GOOD.has(EMOTION_BY_KEY.get(key)?.category ?? ""));
  const place = parsePlace(
    day.items.find((item) => item.location?.name)?.location?.name
  );
  const weekday = dayjs(day.date).format(
    periodKind === "week" ? "dddd" : "dddd, D MMMM"
  );
  const shownPeople = dayPeople.slice(0, 4);
  const names = [
    ...shownPeople.map((person) => person.name),
    ...(dayPeople.length > 4
      ? [t("recaps_connected_more", { count: dayPeople.length - 4 })]
      : []),
  ].join(", ");
  // People on a day are connections, not company: never "with" in titles.
  const agoTitle = () => place?.city ?? t("recaps_day_ago_title");
  const titles = {
    best: () => (bestKey ? t(bestKey, { day: weekday }) : ""),
    hard: () => t("recaps_day_hard_title", { day: weekday }),
    ago: agoTitle,
  };
  const texts: Partial<Record<typeof card.mode, string>> = {
    hard: t("recaps_day_hard_text"),
    ago: t("recaps_day_ago_text", {
      date: dayjs(day.date).format("D MMMM YYYY"),
    }),
  };
  const title = titles[card.mode]();
  return {
    art: <DayMedia day={day} hard={hard} />,
    title,
    titleLabel: title,
    text: texts[card.mode],
    body: (
      <View style={{ gap: 12 }}>
        {dayPeople.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {shownPeople.map((person) => (
              <RingedAvatar key={person.id} person={person} size={32} />
            ))}
            <Secondary>{names}</Secondary>
          </View>
        )}
        {!hard && goodEmotions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row>
              {goodEmotions.map((emotion) => (
                <Emotion key={emotion} emotionKey={emotion} />
              ))}
            </Row>
          </ScrollView>
        )}
        {dayTags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row" }}>
              {dayTags.map((tag) => (
                <TagComponent
                  key={tag.id}
                  title={tag.title}
                  colorName={tag.color}
                  compact
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    ),
    actions: <SeeThisDay date={day.date} />,
  };
};

const getContent = (
  card: SummaryCardData,
  context: Context
): Content | null => {
  switch (card.type) {
    case "day-recap": {
      return dayContent(card, context);
    }
    case "emotions": {
      return emotionsContent(card.counts, context.periodKind);
    }
    case "connected": {
      return connectedContent(card.people, context.people);
    }
    case "most-connected": {
      const key = MOST_CONNECTED_TITLES[context.periodKind];
      if (!key) {
        return null;
      }
      const title = t(key);
      return {
        title,
        titleLabel: title,
        body: <Podium entries={card.people} people={context.people} />,
      };
    }
    case "places-trips": {
      const key = TRIP_TITLES[context.periodKind];
      if (!key) {
        return null;
      }
      const title = t(key, {
        count: card.trips.length,
      });
      return {
        title,
        titleLabel: title,
        body: (
          <View style={{ gap: 10 }}>
            {card.trips.map((trip) => (
              <View
                key={`${trip.city}-${trip.start}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <TripDot />
                <Headline>{trip.city}</Headline>
                <Caption>
                  {`${formatRange(trip.start, trip.end)} · ${t("recaps_days", { count: trip.days })}`}
                </Caption>
              </View>
            ))}
          </View>
        ),
      };
    }
    default: {
      const unknown: never = card;
      return unknown;
    }
  }
};

/** Card that describes the period. No claims about causes. */
export const SummaryCard = ({
  card,
  footer,
  onLayout,
  ...context
}: Context & {
  card: SummaryCardData;
  footer: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const content = getContent(card, context);
  if (!content) {
    return null;
  }
  return (
    <RecapCardShell
      type={card.type}
      onLayout={onLayout}
      art={content.art}
      title={content.title}
      titleLabel={content.titleLabel}
      text={content.text}
      body={content.body}
      actions={content.actions}
      footer={footer}
    />
  );
};
