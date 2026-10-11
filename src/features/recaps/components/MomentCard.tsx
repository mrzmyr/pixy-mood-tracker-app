import dayjs from "dayjs";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { MapPin, Moon } from "react-native-feather";
import { Secondary } from "@/components/Type";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t, tDynamic } from "@/lib/translation";
import type { MomentCard as MomentCardData } from "../types";
import { RecapCardShell } from "./RecapCardShell";
import { RingedAvatar } from "./RingedAvatar";
import { CHIP } from "../chipMarker";
import { ChipText, EmotionChip, TagChip } from "./TitleChip";

const formatDay = (date: string) => dayjs(date).format("D MMMM");

interface Content {
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

/**
 * One moon per night of the run: filled in the sleep color for good nights,
 * an outline in secondary text color for rough ones. No numbers.
 */
const NightsArt = ({ nights, good }: { nights: string[]; good: boolean }) => {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      {nights.map((night) => (
        <View key={night} style={{ alignItems: "center", gap: 8 }}>
          <Moon
            width={32}
            height={32}
            color={good ? colors.moduleSleep : colors.textSecondary}
            fill={good ? colors.moduleSleep : "transparent"}
          />
          <Secondary>{dayjs(night).format("ddd")}</Secondary>
        </View>
      ))}
    </View>
  );
};

const CityArt = () => {
  const colors = useColors();
  return <MapPin width={40} height={40} color={colors.moduleLocation} />;
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
          name: person.name,
          date: formatDay(card.firstDate),
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
        art: <CityArt />,
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
        art: <NightsArt nights={card.nights} good />,
        title,
        titleLabel: title,
        text: t("recaps_sleep_turnaround_text"),
      };
    }
    case "sleep-rough": {
      const title = t("recaps_sleep_rough_title");
      return {
        art: <NightsArt nights={card.nights} good={false} />,
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
      art={content.art}
      title={content.title}
      titleLabel={content.titleLabel}
      text={content.text}
      footer={footer}
    />
  );
};
