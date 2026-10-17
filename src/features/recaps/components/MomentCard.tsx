import dayjs from "dayjs";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import MapPin from "lucide-react-native/icons/map-pin";
import { Secondary } from "@/components/Type";
import { SleepQualityMeter } from "@/features/logger";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t, tDynamic } from "@/lib/translation";
import type { MomentCard as MomentCardData, SleepNight } from "../types";
import { MediaPanel, RecapCardShell } from "./RecapCardShell";
import { RingedAvatar } from "./RingedAvatar";
import { CHIP } from "../chipMarker";
import { ChipText, EmotionChip, TagChip } from "./TitleChip";

const formatDay = (date: string) => dayjs(date).format("D MMMM");

interface Content {
  media?: ReactNode;
  art?: ReactNode;
  title: ReactNode;
  titleLabel: string;
  text: string;
}

interface Lookup {
  people: Person[];
  tags: Tag[];
}

const PersonArt = ({ person }: { person: Person }) => (
  <View style={{ alignItems: "flex-start" }}>
    <RingedAvatar person={person} size={72} />
  </View>
);

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

/** Title, text, and art of each moment, or `null` when its subject is gone. */
const getContent = (
  card: MomentCardData,
  { people, tags }: Lookup
): Content | null => {
  const person =
    "personId" in card
      ? people.find((item) => item.id === card.personId)
      : undefined;
  switch (card.type) {
    case "emotion-again": {
      const title = t("recaps_emotion_again_title", { emotion: CHIP });
      return {
        title: (
          <ChipText
            text={title}
            chip={<EmotionChip emotionKey={card.emotion} />}
          />
        ),
        titleLabel: title.replace(CHIP, emotionLabel(card.emotion)),
        text: t("recaps_emotion_again_text", {
          date: formatDay(card.lastDate),
        }),
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
    case "person-back": {
      if (!person) {
        return null;
      }
      const title = t("recaps_person_back_title", { name: person.name });
      return {
        art: <PersonArt person={person} />,
        title,
        titleLabel: title,
        text: t("recaps_person_back_text", {
          count: card.weeks,
          date: formatDay(card.lastDate),
        }),
      };
    }
    case "person-new": {
      if (!person) {
        return null;
      }
      const title = t("recaps_person_new_title", { name: person.name });
      return {
        art: <PersonArt person={person} />,
        title,
        titleLabel: title,
        text: t("recaps_person_new_text", {
          date: dayjs(card.firstDate).format("dddd, D MMMM"),
        }),
      };
    }
    case "person-milestone": {
      if (!person) {
        return null;
      }
      const title = t("recaps_person_milestone_title", {
        count: card.days,
        name: person.name,
        year: card.year,
      });
      return {
        art: <PersonArt person={person} />,
        title,
        titleLabel: title,
        text: t("recaps_person_milestone_text"),
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
      const tag = tags.find((item) => item.id === card.tagId);
      if (!tag) {
        return null;
      }
      const title = t("recaps_tag_back_title", { tag: CHIP });
      return {
        title: <ChipText text={title} chip={<TagChip tag={tag} />} />,
        titleLabel: title.replace(CHIP, tag.title),
        text: t("recaps_tag_back_text", {
          count: card.days,
          weeks: card.weeks,
        }),
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
      footer={footer}
    />
  );
};
