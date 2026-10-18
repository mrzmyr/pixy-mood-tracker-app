import dayjs from "dayjs";
import { useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import ImageIcon from "lucide-react-native/icons/image";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import { RADIUS } from "@/constants/Radius";
import { EmotionItem } from "@/features/calendar";
import { EMOTIONS } from "@/features/logger";
import {
  NotificationPreview,
  reminderTimeToDate,
} from "@/features/notifications";
import { TagComponent } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { getActiveTags } from "../cards/nudges";
import type { NudgeCard as NudgeCardData } from "../types";
import { MediaPanel, RecapCardShell } from "./RecapCardShell";
import { RingedAvatar } from "./RingedAvatar";
import { CARD_PADDING } from "./layout";

type NudgeType = NudgeCardData["type"];

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
  <View style={{ flexDirection: "row", gap: 16 }}>
    {PLACEHOLDER_PEOPLE.map((person) => (
      <RingedAvatar key={person.id} person={person} size={56} />
    ))}
  </View>
);

const PhotosArt = () => {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 16 }}>
      {PHOTO_ROTATIONS.map((rotation) => (
        <View
          key={rotation}
          style={{
            width: 72,
            height: 72,
            borderRadius: RADIUS.md,
            // Card white on the gray media panel, in both modes.
            backgroundColor: colors.cardBackground,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: `${rotation}deg` }],
          }}
        >
          <ImageIcon width={32} height={32} color={colors.textSecondary} />
        </View>
      ))}
    </View>
  );
};

/** First 6 active tags of the user, as they look in the check-in. */
const CategoriesArt = ({ tags }: ArtProps) => {
  const shownTags = getActiveTags(tags).slice(0, 6);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {shownTags.map((tag) => (
        <TagComponent
          key={tag.id}
          title={tag.title}
          colorName={tag.color}
          compact
          // Drops the tag's flow margins; the row gap spaces the tags.
          style={{ marginRight: 0, marginBottom: 0 }}
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
  card: NudgeCardData;
  tags: Tag[];
  reminderTime: string;
  onTurnOn: () => Promise<void>;
  onNotNow: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const colors = useColors();
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
      media={
        <MediaPanel>
          <Art tags={tags} reminderTime={reminderTime} />
        </MediaPanel>
      }
      title={t(copy.title, options)}
      text={t(copy.text)}
      footer={
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            paddingHorizontal: CARD_PADDING,
            paddingVertical: 8,
            // LinkButton pads itself by 8, so the visible gap is 16.
            columnGap: 8,
            rowGap: 8,
          }}
        >
          <Button
            type="contrast"
            onPress={() => {
              void turnOn();
            }}
            disabled={isBusy}
            testID={`recap-nudge-turn-on-${card.type}`}
            style={{
              borderRadius: RADIUS.sm,
              minHeight: 44,
              paddingVertical: 10,
              paddingHorizontal: 20,
            }}
          >
            {t(copy.action, options)}
          </Button>
          {/* Tertiary action: text color, never gray. */}
          <LinkButton
            type="secondary"
            onPress={onNotNow}
            hitSlop={8}
            style={{ color: colors.text, fontWeight: "400", minHeight: 44 }}
            testID={`recap-nudge-not-now-${card.type}`}
          >
            {t("recaps_nudge_not_now")}
          </LinkButton>
        </View>
      }
    />
  );
};
