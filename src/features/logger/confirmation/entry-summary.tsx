import { useEffect, useEffectEvent, useMemo } from "react";
import type { ReactNode } from "react";
import { Platform, ScrollView, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import { NightSky } from "@/components/night-sky";
import { Sky } from "@/components/sky";
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
import { getPhotoBento, getPhotoTileSize } from "./entry-summary-layout";
import type { PhotoTileSize } from "./entry-summary-layout";
import {
  EmotionsTile,
  MoodTile,
  NoteTile,
  PeopleTile,
  PhotosTile,
  SleepTile,
  TagsTile,
} from "./entry-summary-tiles";
import { useConfirmation } from "./use-confirmation";

const GAP = 10;
const SINGLE_PHOTO_HEIGHT: Record<PhotoTileSize, number> = {
  band: 150,
  half: 120,
  tall: 200,
};

/**
 * A single photo, sleep, and people share rows: the photo left, the others
 * stacked beside it. Without it, sleep and people sit side by side or take
 * the full width alone. 2 or more photos get their own bento under the mood.
 */
const MiddleRows = ({ item, people }: { item: LogItem; people: Person[] }) => {
  const quality = item.sleep?.quality ?? null;
  const hasPeople = people.length > 0;
  const size = getPhotoTileSize({
    hasPhoto: item.photos.length === 1,
    hasSleep: quality !== null,
    hasPeople,
  });
  const isRow = size === null && (quality === null || !hasPeople);
  const besides: ReactNode[] = [
    quality !== null && <SleepTile key="sleep" quality={quality} />,
    hasPeople && <PeopleTile key="people" people={people} isRow={isRow} />,
  ];

  if (size === null) {
    return <View style={{ flexDirection: "row", gap: GAP }}>{besides}</View>;
  }
  const photo = (
    <PhotosTile
      photos={item.photos}
      rows={[{ height: SINGLE_PHOTO_HEIGHT[size], columns: [[0]] }]}
      row={3}
    />
  );
  if (size === "band") {
    return photo;
  }
  return (
    <View style={{ flexDirection: "row", gap: GAP }}>
      {photo}
      <View style={{ flex: 1, gap: GAP }}>{besides}</View>
    </View>
  );
};

/**
 * Last logger step after a new entry, flag `entry-summary`: everything the
 * entry holds as tiles on the sky: clouds by day, stars in dark mode. No
 * module labels: chips, faces, the meter, and the note explain themselves.
 *
 * Mood shows the day average like the calendar pixel; 2+ entries that day
 * add a day strip. No title: the tiles start right away.
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
  const scheme = useColorScheme();
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
        backgroundColor: colors.logBackground,
      }}
    >
      {scheme === "dark" ? <NightSky /> : <Sky />}
      <ScrollView
        contentContainerStyle={{
          // The iOS page sheet already sits below the status bar.
          paddingTop: 24 + (Platform.OS === "android" ? insets.top : 0),
          paddingHorizontal: 16,
          paddingBottom: 16,
          gap: GAP,
        }}
      >
        <MoodTile summary={summary} />
        {item.photos.length > 1 && (
          <PhotosTile
            photos={item.photos}
            rows={getPhotoBento(item.photos.length)}
            row={2}
          />
        )}
        {emotions.length > 0 && <EmotionsTile emotions={emotions} />}
        <MiddleRows item={item} people={entryPeople} />
        {entryTags.length > 0 && <TagsTile tags={entryTags} />}
        {note !== "" && <NoteTile note={note} />}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 8 }}>
        <ConfirmationOffer item={item} />
        <Button testID="confirmation-done" onPress={onClose}>
          {t("done")}
        </Button>
      </View>
    </View>
  );
};
