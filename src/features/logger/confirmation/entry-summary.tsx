import { useEffect, useEffectEvent, useMemo } from "react";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { ConfirmationOffer } from "@/features/interventions";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import type { Person } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { EMOTIONS } from "../config";
import { getDaySummary } from "./day-summary";
import { SummaryHero } from "./entry-summary-hero";
import {
  EmotionsTile,
  MoodHeader,
  NoteTile,
  PeopleTile,
  SleepTile,
  TagsTile,
} from "./entry-summary-tiles";
import { useConfirmation } from "./use-confirmation";

const GAP = 10;
const FADE_HEIGHT = 48;
const HEADER_OVERLAP = 72;

/** Mask over the tiles: opaque, then fading out above the Done button. */
const BottomFadeMask = () => (
  <View style={{ flex: 1 }}>
    <View style={{ flex: 1, backgroundColor: "#000" }} />
    <LinearGradient
      colors={["#000", "transparent"]}
      style={{ height: FADE_HEIGHT }}
    />
  </View>
);

/** Sleep and people side by side, or one of them at full width. */
const MiddleRows = ({ item, people }: { item: LogItem; people: Person[] }) => {
  const quality = item.sleep?.quality ?? null;
  const hasPeople = people.length > 0;

  return (
    <View style={{ flexDirection: "row", gap: GAP }}>
      {quality !== null && <SleepTile quality={quality} />}
      {hasPeople && <PeopleTile people={people} isRow={quality === null} />}
    </View>
  );
};

/**
 * Last logger step after a new entry, flag `entry-summary`. A full-width
 * hero leads (photos, else the place on a map, else the sky), then the mood
 * as headline, then the rest of the entry as tiles. No module labels: chips,
 * faces, the meter, and the note explain themselves.
 *
 * Mood shows the day average like the calendar pixel; 2+ entries that day
 * add a day strip.
 *
 * Calls `onClose` on Done.
 */
export const EntrySummary = ({
  item,
  entriesCount,
  onClose,
}: {
  item: LogItem;
  entriesCount: number;
  onClose: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const logState = useLogState();
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  useConfirmation({ item, entriesCount });

  const summary = useMemo(
    () => getDaySummary({ items: logState.items, item }),
    [logState.items, item]
  );
  // Unknown keys from newer app versions and deleted tags or people drop out.
  const emotions = item.emotions.flatMap((key) =>
    EMOTIONS.filter((emotion) => emotion.key === key)
  );
  const entryTags = item.tags.flatMap(({ id }) =>
    tags.filter((tag) => tag.id === id)
  );
  const entryPeople = item.people.flatMap(({ id }) =>
    people.filter((person) => person.id === id)
  );
  const note = item.message.trim();

  const success = useEffectEvent(() => {
    void haptics.success();
  });
  useEffect(() => {
    success();
  }, []);

  return (
    <View
      testID="entry-summary"
      style={{
        flex: 1,
        overflow: "hidden",
        backgroundColor: colors.background,
      }}
    >
      <MaskedView style={{ flex: 1 }} maskElement={<BottomFadeMask />}>
        <ScrollView
          contentContainerStyle={{
            // Last tile scrolls clear of the fade.
            paddingBottom: FADE_HEIGHT,
          }}
        >
          <SummaryHero
            item={item}
            // The iOS page sheet already sits below the status bar.
            extraHeight={Platform.OS === "android" ? insets.top : 0}
          />
          <View
            style={{
              // The header rises into the faded bottom of the hero.
              marginTop: -HEADER_OVERLAP,
              paddingHorizontal: 16,
              gap: GAP,
            }}
          >
            <MoodHeader summary={summary} item={item} />
            {emotions.length > 0 && <EmotionsTile emotions={emotions} />}
            <MiddleRows item={item} people={entryPeople} />
            {entryTags.length > 0 && <TagsTile tags={entryTags} />}
            {note !== "" && <NoteTile note={note} />}
          </View>
        </ScrollView>
      </MaskedView>

      <View
        style={{
          paddingTop: 8,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 8,
        }}
      >
        <ConfirmationOffer item={item} />
        <Button testID="confirmation-done" onPress={onClose}>
          {t("done")}
        </Button>
      </View>
    </View>
  );
};
