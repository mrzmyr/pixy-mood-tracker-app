import dayjs from "dayjs";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import MapPin from "lucide-react-native/icons/map-pin";
import { Secondary } from "@/components/type";
import { SleepQualityMeter } from "@/features/logger";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t, tDynamic } from "@/lib/translation";
import type { MomentCard as MomentCardData, SleepNight } from "../types";
import { MediaPanel, RecapCardShell } from "./recap-card-shell";
import { getMomentLine } from "./person-moment-line";
import { RingedAvatar } from "./ringed-avatar";
import { CHIP } from "../chip-marker";
import {
  ChipText,
  EmotionChip,
  RowEmotionChip,
  RowTagChip,
  TagChip,
} from "./title-chip";

const formatDay = (date: string) => dayjs(date).format("D MMMM");

interface Content {
  media?: ReactNode;
  art?: ReactNode;
  title: ReactNode;
  titleLabel: string;
  text?: string;
  body?: ReactNode;
}

interface Lookup {
  people: Person[];
  tags: Tag[];
}

/** One row per person: ringed avatar, name, and why they show. */
const PeopleMomentsList = ({
  rows,
}: {
  rows: { person: Person; line: string }[];
}) => {
  const colors = useColors();
  return (
    <View style={{ gap: 12 }}>
      {rows.map(({ person, line }) => (
        <View
          key={person.id}
          accessible
          accessibilityLabel={`${person.name}, ${line}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <RingedAvatar person={person} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 17, fontWeight: "600", color: colors.text }}
            >
              {person.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontSize: 15, color: colors.textSecondary }}
            >
              {line}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

/** Night box: the sleep slide's meter at half size. */
const NIGHT_BOX = 32;

/**
 * Every night of the week with the sleep meter from the check-in. Nights of
 * the run sit in a box with a bold weekday; the other meters fade back.
 * Nights without sleep data show a short dash, never an empty meter, which
 * would read as a very bad night.
 */
const NightsArt = ({
  week,
  nights,
}: {
  week: SleepNight[];
  nights: string[];
}) => {
  const colors = useColors();
  const run = new Set(nights);
  return (
    <MediaPanel>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between" }}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {week.map((night) => {
          const inRun = run.has(night.date);
          return (
            <View key={night.date} style={{ alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: NIGHT_BOX,
                  height: NIGHT_BOX,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: RADIUS.sm,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: inRun ? colors.recapCardBorder : "transparent",
                  backgroundColor: inRun ? colors.cardBackground : undefined,
                  // Fades the meter only: weekday labels keep their contrast.
                  opacity: inRun ? 1 : 0.4,
                }}
              >
                {night.sleep === null ? (
                  <View
                    style={{
                      width: 8,
                      height: 2,
                      borderRadius: RADIUS.full,
                      backgroundColor: colors.textSecondary,
                    }}
                  />
                ) : (
                  <SleepQualityMeter value={night.sleep} height={16} />
                )}
              </View>
              <Secondary
                style={
                  inRun ? { color: colors.text, fontWeight: "600" } : undefined
                }
              >
                {dayjs(night.date).format("dd")}
              </Secondary>
            </View>
          );
        })}
      </View>
    </MediaPanel>
  );
};

const CityArt = () => {
  const colors = useColors();
  return (
    <MediaPanel minHeight={120}>
      <View style={{ alignItems: "center" }}>
        <MapPin width={32} height={32} color={colors.text} />
      </View>
    </MediaPanel>
  );
};

const emotionLabel = (key: string) => tDynamic(`log_emotion_${key}`);

/** Several emotions or tags back: chip, then since when or how long. */
const BackList = ({
  rows,
}: {
  rows: { key: string; chip: ReactNode; label: string; line: string }[];
}) => {
  const colors = useColors();
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => (
        <View
          key={row.key}
          accessible
          accessibilityLabel={`${row.label}, ${row.line}`}
          style={{ alignItems: "flex-start", gap: 4 }}
        >
          {row.chip}
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>
            {row.line}
          </Text>
        </View>
      ))}
    </View>
  );
};

/** Title, text, and art of each moment, or `null` when its subject is gone. */
const getContent = (
  card: MomentCardData,
  { people, tags }: Lookup
): Content | null => {
  switch (card.type) {
    case "emotion-again": {
      const [only, ...more] = card.emotions;
      if (!only) {
        return null;
      }
      if (more.length === 0) {
        const title = t("recaps_emotion_again_title", { emotion: CHIP });
        return {
          title: (
            <ChipText
              text={title}
              chip={<EmotionChip emotionKey={only.emotion} />}
            />
          ),
          titleLabel: title.replace(CHIP, emotionLabel(only.emotion)),
          text: t("recaps_emotion_again_text", {
            date: formatDay(only.lastDate),
          }),
        };
      }
      const title = t(
        card.periodKind === "month"
          ? "recaps_emotions_back_title_month"
          : "recaps_emotions_back_title_week"
      );
      return {
        title,
        titleLabel: title,
        body: (
          <BackList
            rows={card.emotions.map((back) => ({
              key: back.emotion,
              chip: <RowEmotionChip emotionKey={back.emotion} />,
              label: emotionLabel(back.emotion),
              line: t("recaps_emotion_again_text", {
                date: formatDay(back.lastDate),
              }),
            }))}
          />
        ),
      };
    }
    case "emotion-absent": {
      const title = t("recaps_emotion_absent_title", { emotion: CHIP });
      return {
        title: (
          <ChipText
            text={title}
            chip={<EmotionChip emotionKey={card.emotion} />}
          />
        ),
        titleLabel: title.replace(CHIP, emotionLabel(card.emotion)),
        text: t("recaps_emotion_absent_text", { count: card.countBefore }),
      };
    }
    case "people-moments": {
      const rows = card.people.flatMap((moment) => {
        const person = people.find((item) => item.id === moment.personId);
        return person ? [{ person, line: getMomentLine(moment) }] : [];
      });
      if (rows.length === 0) {
        return null;
      }
      const title = t(
        card.periodKind === "month"
          ? "recaps_people_moments_title_month"
          : "recaps_people_moments_title_week"
      );
      return {
        body: <PeopleMomentsList rows={rows} />,
        title,
        titleLabel: title,
      };
    }
    case "first-city": {
      const title = t("recaps_first_city_title", { city: card.city });
      return {
        media: <CityArt />,
        title,
        titleLabel: title,
        text: card.district
          ? t("recaps_first_city_text_district", {
              day: formatDay(card.date),
              district: card.district,
            })
          : t("recaps_first_city_text", { day: formatDay(card.date) }),
      };
    }
    case "tag-back": {
      const known = card.tags.flatMap((back) => {
        const tag = tags.find((item) => item.id === back.tagId);
        return tag ? [{ back, tag }] : [];
      });
      const [only, ...more] = known;
      if (!only) {
        return null;
      }
      if (more.length === 0) {
        const title = t("recaps_tag_back_title", { tag: CHIP });
        return {
          title: <ChipText text={title} chip={<TagChip tag={only.tag} />} />,
          titleLabel: title.replace(CHIP, only.tag.title),
          text: t("recaps_tag_back_text", {
            count: only.back.days,
            weeks: only.back.weeks,
          }),
        };
      }
      const title = t("recaps_tags_back_title");
      return {
        title,
        titleLabel: title,
        body: (
          <BackList
            rows={known.map(({ back, tag }) => ({
              key: tag.id,
              chip: <RowTagChip tag={tag} />,
              label: tag.title,
              line: t("recaps_tag_back_text", {
                count: back.days,
                weeks: back.weeks,
              }),
            }))}
          />
        ),
      };
    }
    case "sleep-turnaround": {
      const title = t("recaps_sleep_turnaround_title", {
        count: card.nights.length,
      });
      return {
        media: <NightsArt week={card.week} nights={card.nights} />,
        title,
        titleLabel: title,
        text: t("recaps_sleep_turnaround_text"),
      };
    }
    case "sleep-rough": {
      const title = t("recaps_sleep_rough_title");
      return {
        media: <NightsArt week={card.week} nights={card.nights} />,
        title,
        titleLabel: title,
        text: t("recaps_sleep_rough_text", { count: card.nights.length }),
      };
    }
    default: {
      const unknown: never = card;
      return unknown;
    }
  }
};

/** Card for a fact worth noticing, with Helpful / Not Helpful below. */
export const MomentCard = ({
  card,
  people,
  tags,
  footer,
  onLayout,
}: {
  card: MomentCardData;
  people: Person[];
  tags: Tag[];
  footer: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const content = getContent(card, { people, tags });
  if (!content) {
    return null;
  }
  return (
    <RecapCardShell
      type={card.type}
      onLayout={onLayout}
      media={content.media}
      art={content.art}
      title={content.title}
      titleLabel={content.titleLabel}
      text={content.text}
      body={content.body}
      footer={footer}
    />
  );
};
