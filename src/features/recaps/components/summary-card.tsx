import dayjs from "dayjs";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Button from "@/components/button";
import { Body, Secondary } from "@/components/type";
import { getTypeMetrics } from "@/components/type-metrics";
import { RADIUS } from "@/constants/radius";
import { RATING_MAPPING } from "@/constants/ratings";
import { EMOTIONS } from "@/features/logger";
import type { Person } from "@/features/people";
import { PhotoThumbnail } from "@/features/photos";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import { parsePlace } from "../places";
import type {
  ConnectedPerson,
  EmotionCount,
  PeriodKind,
  RecapDay,
  SummaryCard as SummaryCardData,
} from "../types";
import type { Content, Context } from "./card-content";
import { MediaPanel, RecapCardShell } from "./recap-card-shell";
import { getStatContent } from "./stat-content";
import { getMomentLine } from "./person-moment-line";
import { RingedAvatar } from "./ringed-avatar";
import { RowEmotionChip, RowTagChip } from "./title-chip";

const EMOTION_BY_KEY = new Map(
  EMOTIONS.map((emotion) => [emotion.key, emotion])
);
const GOOD = new Set(["very_good", "good"]);

const Row = ({ children }: { children: ReactNode }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
    {children}
  </View>
);

const Bar = ({ fraction }: { fraction: number }) => {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        height: 8,
        borderRadius: RADIUS.full,
        backgroundColor: colors.cardBorder,
      }}
    >
      <View
        style={{
          width: `${Math.round(fraction * 100)}%`,
          height: 8,
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
    <View style={{ gap: 8 }}>
      {counts.map((count, index) => (
        <View
          key={count.emotion}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Secondary style={{ minWidth: 24, fontVariant: ["tabular-nums"] }}>
            {index + 1}
          </Secondary>
          <RowEmotionChip emotionKey={count.emotion} />
          <Bar fraction={count.days / top} />
          <Secondary
            style={{
              minWidth: 32,
              textAlign: "right",
              fontVariant: ["tabular-nums"],
            }}
          >
            {count.days}
          </Secondary>
        </View>
      ))}
    </View>
  );
};

const emotionsContent = (
  counts: EmotionCount[],
  periodKind: PeriodKind
): Content => {
  if (periodKind === "week") {
    const title = t("recaps_emotions_title");
    return {
      title,
      titleLabel: title,
      body: (
        <Row>
          {counts.slice(0, 6).map((count) => (
            <RowEmotionChip key={count.emotion} emotionKey={count.emotion} />
          ))}
        </Row>
      ),
    };
  }
  const size = periodKind === "year" ? 10 : 3;
  // "Top 10" only when there are 10 to show.
  const title =
    periodKind === "year" && counts.length >= size
      ? t("recaps_emotions_year_title")
      : t("recaps_emotions_title");
  return {
    title,
    titleLabel: title,
    body: <Ranked counts={counts.slice(0, size)} />,
  };
};

/**
 * Days connected, then the moment: "1 day connected · Back after 6 weeks".
 * A milestone already counts days, so it stands alone.
 */
const getConnectedLine = (entry: ConnectedPerson) => {
  const days = t("recaps_connected_days", { count: entry.days });
  if (!entry.moment) {
    return days;
  }
  const moment = getMomentLine(entry.moment);
  return entry.moment.kind === "milestone" ? moment : `${days} · ${moment}`;
};

const PersonRow = ({
  entry,
  person,
}: {
  entry: ConnectedPerson;
  person: Person;
}) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
    <RingedAvatar person={person} size={40} />
    <View style={{ flex: 1, gap: 4 }}>
      <Body>{person.name}</Body>
      <Secondary>{getConnectedLine(entry)}</Secondary>
      {entry.emotions.length > 0 && (
        <Row>
          {entry.emotions.map((emotion) => (
            <RowEmotionChip key={emotion} emotionKey={emotion} />
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
    {PODIUM_ORDER.map((index) => {
      if (index >= entries.length) {
        return null;
      }
      const entry = entries[index];
      const person = findPerson(people, entry.personId);
      return person ? (
        <View
          key={entry.personId}
          style={{ alignItems: "center", gap: 8, flex: 1 }}
        >
          <RingedAvatar person={person} size={index === 0 ? 80 : 64} />
          <Body style={{ textAlign: "center" }}>{person.name}</Body>
          <Secondary>{t("recaps_days", { count: entry.days })}</Secondary>
        </View>
      ) : null;
    })}
  </View>
);

const PLACES_TITLES: Record<PeriodKind, TranslationKey> = {
  week: "recaps_places_title_week",
  month: "recaps_places_title_month",
  year: "recaps_places_title_year",
};

const formatRange = (start: string, end: string) =>
  start === end
    ? dayjs(start).format("D MMM")
    : `${dayjs(start).format("D MMM")} – ${dayjs(end).format("D MMM")}`;

/** Dot centered on the first line of the city name. */
/** Filled dot for a trip, ring for an area of the home city. */
const TripDot = ({ isTrip }: { isTrip: boolean }) => {
  const colors = useColors();
  const { lineHeight } = getTypeMetrics().body;
  return (
    <View style={{ height: lineHeight, justifyContent: "center" }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: RADIUS.full,
          borderWidth: 2,
          borderColor: colors.moduleLocation,
          backgroundColor: isTrip ? colors.moduleLocation : "transparent",
        }}
      />
    </View>
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
        height: 160,
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
    <MediaPanel>
      <View style={{ flexDirection: "row", gap: 8 }}>
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
    </MediaPanel>
  );
};

/** Outline button across the card: secondary to the card's message. */
const SeeThisDay = ({ date }: { date: string }) => {
  const router = useRouter();
  const colors = useColors();
  return (
    <Button
      type="secondary"
      onPress={() =>
        router.push({ pathname: "/days/[date]", params: { date } })
      }
      testID={`recap-see-day-${date}`}
      style={{
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.recapCardBorder,
        backgroundColor: colors.cardBackground,
        minHeight: 44,
        paddingVertical: 10,
      }}
    >
      <Body style={{ fontWeight: "600" }}>{t("recaps_day_see")}</Body>
    </Button>
  );
};

const dayContent = (
  card: Extract<SummaryCardData, { type: "day-recap" }>,
  { history, people, tags, period }: Context
): Content | null => {
  const periodKind = period.kind;
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
  // People on a day are connections, not company: titles never say "a day
  // with" someone.
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
    media: <DayMedia day={day} hard={hard} />,
    title,
    titleLabel: title,
    text: texts[card.mode],
    body: (
      <View style={{ gap: 16 }}>
        {dayPeople.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {shownPeople.map((person) => (
              <RingedAvatar key={person.id} person={person} size={24} />
            ))}
            <Secondary style={{ flexShrink: 1 }}>{names}</Secondary>
          </View>
        )}
        {!hard && goodEmotions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row>
              {goodEmotions.map((emotion) => (
                <RowEmotionChip key={emotion} emotionKey={emotion} />
              ))}
            </Row>
          </ScrollView>
        )}
        {dayTags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {dayTags.map((tag) => (
                <RowTagChip key={tag.id} tag={tag} />
              ))}
            </View>
          </ScrollView>
        )}
        <SeeThisDay date={day.date} />
      </View>
    ),
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
    case "mood-chart":
    case "mood-count":
    case "mood-days":
    case "sleep-chart":
    case "tags":
    case "tag-days":
    case "year-pixels":
    case "best-month": {
      return getStatContent(card, context);
    }
    case "emotions": {
      return emotionsContent(card.counts, context.period.kind);
    }
    case "connected": {
      return connectedContent(card.people, context.people);
    }
    case "most-connected": {
      const key = MOST_CONNECTED_TITLES[context.period.kind];
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
    case "places": {
      const title = t(PLACES_TITLES[context.period.kind]);
      const rows = [
        ...card.trips.map((trip) => ({
          key: `trip-${trip.city}-${trip.start}`,
          name: trip.city,
          isTrip: true,
          detail: `${formatRange(trip.start, trip.end)} · ${t("recaps_days", { count: trip.days })}`,
        })),
        ...card.spots.map((spot) => ({
          key: `spot-${spot.name}`,
          name: spot.name,
          isTrip: false,
          detail: t("recaps_days", { count: spot.days }),
        })),
      ];
      return {
        title,
        titleLabel: title,
        text:
          card.trips.length > 0
            ? t("recaps_places_trips", { count: card.trips.length })
            : undefined,
        body: (
          <View style={{ gap: 8 }}>
            {rows.map((row) => (
              <View
                key={row.key}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <TripDot isTrip={row.isTrip} />
                {/* Details wrap under the name, not under the dot. */}
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    columnGap: 8,
                    rowGap: 4,
                  }}
                >
                  <Body>{row.name}</Body>
                  <Secondary>{row.detail}</Secondary>
                </View>
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
      media={content.media}
      title={content.title}
      titleLabel={content.titleLabel}
      text={content.text}
      body={content.body}
      footer={footer}
    />
  );
};
