import dayjs from "dayjs";
import { useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { Image as ImageIcon } from "react-native-feather";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import { RADIUS } from "@/constants/Radius";
import { EmotionItem } from "@/features/calendar";
import { EMOTIONS } from "@/features/logger";
import {
  NotificationPreview,
  reminderTimeToDate,
} from "@/features/notifications";
import { PersonAvatar } from "@/features/people";
import { TagComponent } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { getActiveTags } from "../cards/nudges";
import type { RecapCard } from "../types";
import { RecapCardShell } from "./RecapCardShell";

type NudgeType = RecapCard["type"];

const COPY: Record<
  NudgeType,
  { title: TranslationKey; text: TranslationKey; action: TranslationKey }
> = {
  "nudge-reminder": {
    title: "recaps_nudge_reminder_title",
    text: "recaps_nudge_reminder_text",
    action: "recaps_nudge_reminder_action",
  },
  "intro-emotions": {
    title: "recaps_intro_emotions_title",
    text: "recaps_intro_emotions_text",
    action: "recaps_intro_emotions_action",
  },
  "intro-people": {
    title: "recaps_intro_people_title",
    text: "recaps_intro_people_text",
    action: "recaps_intro_people_action",
  },
  "intro-photos": {
    title: "recaps_intro_photos_title",
    text: "recaps_intro_photos_text",
    action: "recaps_intro_photos_action",
  },
  "intro-categories": {
    title: "recaps_intro_categories_title",
    text: "recaps_intro_categories_text",
    action: "recaps_intro_categories_action",
  },
};

interface ArtProps {
  tags: Tag[];
  /** Saved reminder time, `HH:mm`. */
  reminderTime: string;
}

const ART_EMOTION_KEYS = new Set(["calm", "proud", "loved"]);
const ART_EMOTIONS = EMOTIONS.filter((emotion) =>
  ART_EMOTION_KEYS.has(emotion.key)
);
const PLACEHOLDER_PEOPLE = ["a", "b", "c"].map((id) => ({
  id,
  name: "",
  avatar: null,
}));
const PHOTO_ROTATIONS = [-4, 2, -2];

const ReminderArt = ({ reminderTime }: ArtProps) => (
  <NotificationPreview time={reminderTimeToDate(reminderTime)} enabled />
);

const EmotionsArt = () => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
    {ART_EMOTIONS.map((emotion) => (
      <EmotionItem key={emotion.key} emotion={emotion} />
    ))}
  </View>
);

const PeopleArt = () => (
  <View style={{ flexDirection: "row", gap: 12 }}>
    {PLACEHOLDER_PEOPLE.map((person) => (
      <PersonAvatar key={person.id} person={person} size={56} />
    ))}
  </View>
);

const PhotosArt = () => {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {PHOTO_ROTATIONS.map((rotation) => (
        <View
          key={rotation}
          style={{
            width: 72,
            height: 72,
            borderRadius: RADIUS.md,
            backgroundColor: colors.backgroundSecondary,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: `${rotation}deg` }],
          }}
        >
          <ImageIcon width={28} height={28} color={colors.textSecondary} />
        </View>
      ))}
    </View>
  );
};

/** First 6 active tags of the user, as they look in the check-in. */
const CategoriesArt = ({ tags }: ArtProps) => {
  const shownTags = getActiveTags(tags).slice(0, 6);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {shownTags.map((tag) => (
        <TagComponent
          key={tag.id}
          title={tag.title}
          colorName={tag.color}
          compact
        />
      ))}
    </View>
  );
};

const ART: Record<NudgeType, (props: ArtProps) => ReactNode> = {
  "nudge-reminder": ReminderArt,
  "intro-emotions": EmotionsArt,
  "intro-people": PeopleArt,
  "intro-photos": PhotosArt,
  "intro-categories": CategoriesArt,
};

/** Card that offers to turn a feature on: art, benefit, action, Not Now. */
export const NudgeCard = ({
  card,
  tags,
  reminderTime,
  onTurnOn,
  onNotNow,
  onLayout,
}: {
  card: RecapCard;
  tags: Tag[];
  reminderTime: string;
  onTurnOn: () => Promise<void>;
  onNotNow: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const copy = COPY[card.type];
  const Art = ART[card.type];
  const options =
    card.type === "intro-categories"
      ? { count: card.tagsCount }
      : { time: dayjs(reminderTimeToDate(reminderTime)).format("LT") };

  // `onTurnOn` reports its own failures and never rejects.
  const turnOn = async () => {
    setIsBusy(true);
    await onTurnOn();
    setIsBusy(false);
  };

  return (
    <RecapCardShell
      type={card.type}
      onLayout={onLayout}
      art={<Art tags={tags} reminderTime={reminderTime} />}
      title={t(copy.title, options)}
      text={t(copy.text)}
      actions={
        <View style={{ gap: 4 }}>
          <Button
            onPress={() => {
              void turnOn();
            }}
            disabled={isBusy}
            testID={`recap-nudge-turn-on-${card.type}`}
          >
            {t(copy.action, options)}
          </Button>
          <LinkButton
            type="secondary"
            onPress={onNotNow}
            testID={`recap-nudge-not-now-${card.type}`}
          >
            {t("recaps_nudge_not_now")}
          </LinkButton>
        </View>
      }
    />
  );
};
