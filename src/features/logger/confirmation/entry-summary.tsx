import { useEffect, useEffectEvent, useMemo } from "react";
import type { ReactNode } from "react";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import Button from "@/components/button";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { ConfirmationOffer } from "@/features/interventions";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { EMOTIONS } from "../config";
import { getDaySummary } from "./day-summary";
import { HERO_HEIGHT, SummaryHero } from "./entry-summary-hero";
import { HALF_TILE_CHIPS_MAX, getBentoRows } from "./entry-summary-layout";
import type { TileSpan } from "./entry-summary-layout";
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

/** One summary tile and how wide it is in the grid. */
interface SummaryTile {
  key: string;
  span: TileSpan;
  node: ReactNode;
}

/** Tiles in two columns: halves pair up, the rest takes the full width. */
const BentoGrid = ({ tiles }: { tiles: SummaryTile[] }) =>
  getBentoRows(tiles).map((row) => (
    <View
      key={row.map((tile) => tile.key).join(",")}
      style={{ flexDirection: "row", gap: GAP }}
    >
      {row.map((tile) => (
        <View key={tile.key} style={{ flex: 1 }}>
          {tile.node}
        </View>
      ))}
    </View>
  ));

/** Half width for a few chips, full width for more. */
const chipSpan = (count: number): TileSpan =>
  count > HALF_TILE_CHIPS_MAX ? "full" : "half";

/**
 * Last logger step after a new entry. A still, full-width hero leads
 * (photos, else the place on a map, else the sky), then the mood as headline,
 * then the rest of the entry as tiles. No module labels: chips, faces, the
 * meter, and the note explain themselves.
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
  const headerHeight = useHeaderHeight();
  // The iOS page sheet already sits below the status bar.
  const heroExtraHeight = Platform.OS === "android" ? insets.top : 0;
  // iOS 26 fades a scroll view under the see-through sheet bar. The tiles
  // start below the bar and scroll over the still hero, so the sky stays
  // clear up to the top.
  const scrollTop = Platform.OS === "ios" ? headerHeight : 0;
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
  const quality = item.sleep?.quality ?? null;

  // Order of the grid; the note always comes last at full width.
  const candidates: (SummaryTile | false)[] = [
    emotions.length > 0 && {
      key: "emotions",
      span: chipSpan(emotions.length),
      node: <EmotionsTile emotions={emotions} />,
    },
    quality !== null && {
      key: "sleep",
      span: "half",
      node: <SleepTile quality={quality} />,
    },
    entryPeople.length > 0 && {
      key: "people",
      span: "half",
      node: <PeopleTile people={entryPeople} />,
    },
    entryTags.length > 0 && {
      key: "tags",
      span: chipSpan(entryTags.length),
      node: <TagsTile tags={entryTags} />,
    },
    note !== "" && {
      key: "note",
      span: "full",
      node: <NoteTile note={note} />,
    },
  ];
  const tiles = candidates.filter(
    (tile): tile is SummaryTile => tile !== false
  );

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
        backgroundColor: colors.summaryBackground,
      }}
    >
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
      >
        <SummaryHero item={item} extraHeight={heroExtraHeight} />
      </View>
      <MaskedView
        style={{ flex: 1, marginTop: scrollTop }}
        maskElement={<BottomFadeMask />}
      >
        <ScrollView
          contentContainerStyle={{
            // The header rises into the faded bottom of the hero.
            paddingTop:
              HERO_HEIGHT + heroExtraHeight - HEADER_OVERLAP - scrollTop,
            paddingHorizontal: 16,
            // Last tile scrolls clear of the fade.
            paddingBottom: FADE_HEIGHT,
            gap: GAP,
          }}
        >
          <MoodHeader summary={summary} item={item} />
          <BentoGrid tiles={tiles} />
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
