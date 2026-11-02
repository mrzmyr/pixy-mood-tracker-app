import Ellipsis from "lucide-react-native/icons/ellipsis";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import { EMOTIONS, EmotionIndicator } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import {
  PersonAvatar,
  PersonChip,
  getLetterSection,
  TILE_RING_GAP,
  TILE_RING_WIDTH,
} from "@/features/people";
import type { Person } from "@/features/people";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import useScale from "@/hooks/use-scale";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import type { Emotion } from "@/types";
import {
  EMOTION_QUADRANTS,
  getDefaultQuadrant,
  getEmotionQuadrant,
  getQuadrantLabel,
} from "../emotion-quadrants";
import type { EmotionQuadrant } from "../emotion-quadrants";
import { EmotionChip } from "./quick-check-in-chips";
import { QuickCheckInPickerSheet } from "./quick-check-in-picker-sheet";
import type { PickerItem } from "./quick-check-in-picker-sheet";

/** Avatar diameter in the people row. */
const AVATAR_SIZE = 56;

/** Mood color of each quadrant, so the field follows the user's scale. */
const QUADRANT_RATING: Record<EmotionQuadrant, LogItem["rating"]> = {
  high_unpleasant: "extremely_bad",
  high_pleasant: "very_good",
  low_unpleasant: "very_bad",
  low_pleasant: "good",
};

const QuadrantButton = ({
  quadrant,
  isActive,
  pickedCount,
  onPress,
}: {
  quadrant: EmotionQuadrant;
  isActive: boolean;
  pickedCount: number;
  onPress: () => void;
}) => {
  const haptics = useHaptics();
  const scale = useScale(useSetting("scaleType"));
  const mood = scale.colors[QUADRANT_RATING[quadrant]];
  const label = getQuadrantLabel(quadrant);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      testID={`quick-check-in-quadrant-${quadrant}`}
      onPress={async () => {
        await haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        backgroundColor: mood.background,
        // Inactive fields fade; the bold label carries the state too.
        opacity: (isActive ? 1 : 0.55) * (pressed ? 0.8 : 1),
      })}
    >
      <Label
        size={13}
        strong={isActive}
        numberOfLines={2}
        style={{ flex: 1, color: mood.text }}
      >
        {label}
      </Label>
      {pickedCount > 0 && (
        <Label size={13} strong style={{ color: mood.text }}>
          {pickedCount}
        </Label>
      )}
    </Pressable>
  );
};

/**
 * Emotions on an energy × pleasantness field (mood meter). Four fields pick
 * the quadrant; its emotions show as chips. The mood picks the first
 * quadrant until the user taps one. Each field counts its picked emotions.
 * "All Emotions" opens the full list.
 */
export const EmotionMatrix = ({
  emotions,
  picked,
  rating,
  onToggle,
  onShowAll,
}: {
  emotions: Emotion[];
  picked: ReadonlySet<string>;
  rating: LogItem["rating"] | null;
  onToggle: (key: string) => void;
  onShowAll: () => void;
}) => {
  const colors = useColors();
  const [chosen, setChosen] = useState<EmotionQuadrant | null>(null);
  const active = chosen ?? getDefaultQuadrant(rating);

  const countIn = (quadrant: EmotionQuadrant) => {
    let count = 0;
    for (const key of picked) {
      if (getEmotionQuadrant(key) === quadrant) {
        count += 1;
      }
    }
    return count;
  };

  const field = (quadrant: EmotionQuadrant) => (
    <QuadrantButton
      key={quadrant}
      quadrant={quadrant}
      isActive={quadrant === active}
      pickedCount={countIn(quadrant)}
      onPress={() => setChosen(quadrant)}
    />
  );

  return (
    <View style={{ gap: 12 }}>
      <View accessibilityRole="tablist" style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {EMOTION_QUADRANTS.slice(0, 2).map(field)}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {EMOTION_QUADRANTS.slice(2).map(field)}
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {emotions.flatMap((emotion) =>
          getEmotionQuadrant(emotion.key) === active
            ? [
                <EmotionChip
                  key={emotion.key}
                  emotion={emotion}
                  selected={picked.has(emotion.key)}
                  onPress={() => onToggle(emotion.key)}
                />,
              ]
            : []
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("quick_check_in_all_emotions")}
          testID="quick-check-in-all-emotions"
          onPress={onShowAll}
          style={({ pressed }) => ({
            justifyContent: "center",
            borderRadius: RADIUS.full,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.tint,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginBottom: 8,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Label size={16} style={{ color: colors.tint }}>
            {t("quick_check_in_all_emotions")}
          </Label>
        </Pressable>
      </View>
    </View>
  );
};

/** Last cell of the people row: opens the full list. */
const AllPeopleTile = ({ onPress }: { onPress: () => void }) => {
  const colors = useColors();
  const outer = AVATAR_SIZE + 2 * (TILE_RING_GAP + TILE_RING_WIDTH);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("quick_check_in_all_people")}
      testID="quick-check-in-all-people"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: outer,
          height: outer,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: RADIUS.full,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: colors.tint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ellipsis size={22} color={colors.tint} strokeWidth={2} />
        </View>
      </View>
      <Label
        size={14}
        numberOfLines={1}
        style={{ marginTop: 6, maxWidth: outer, color: colors.tint }}
      >
        {t("quick_check_in_all")}
      </Label>
    </Pressable>
  );
};

/**
 * People as a row of avatars, best guess first, then "All" for the full
 * list. Faces are found faster than names in a list.
 */
export const PeopleRow = ({
  people,
  picked,
  onToggle,
  onShowAll,
}: {
  people: Person[];
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onShowAll: () => void;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    style={{ marginHorizontal: -16 }}
    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
  >
    {people.map((person) => (
      <PersonChip
        key={person.id}
        variant="tile"
        size={AVATAR_SIZE}
        person={person}
        selected={picked.has(person.id)}
        onPress={() => onToggle(person.id)}
        testID={`quick-check-in-person-${person.id}`}
      />
    ))}
    <AllPeopleTile onPress={onShowAll} />
  </ScrollView>
);

/** Every enabled emotion, grouped by quadrant, A to Z inside. */
const getEmotionItems = (): PickerItem[] =>
  EMOTIONS.flatMap((emotion) =>
    emotion.disabled === true
      ? []
      : [{ emotion, quadrant: getEmotionQuadrant(emotion.key) }]
  )
    .sort(
      (a, b) =>
        EMOTION_QUADRANTS.indexOf(a.quadrant) -
          EMOTION_QUADRANTS.indexOf(b.quadrant) ||
        a.emotion.label.localeCompare(b.emotion.label)
    )
    .map(({ emotion, quadrant }) => ({
      key: emotion.key,
      label: emotion.label,
      section: getQuadrantLabel(quadrant),
      leading: <EmotionIndicator emotion={emotion} />,
    }));

/** Active people A to Z by letter, names without a letter under `#` last. */
const getPeopleItems = (people: Person[]): PickerItem[] =>
  people
    .flatMap((person) =>
      person.isArchived === true
        ? []
        : [{ person, section: getLetterSection(person.name) }]
    )
    .sort(
      (a, b) =>
        Number(a.section === "#") - Number(b.section === "#") ||
        a.section.localeCompare(b.section) ||
        a.person.name.localeCompare(b.person.name)
    )
    .map(({ person, section }) => ({
      key: person.id,
      label: person.name,
      section,
      leading: <PersonAvatar person={person} size={32} />,
    }));

/** Full lists behind "All Emotions" and "All" in the people row. */
export const QuickCheckInListSheets = ({
  open,
  people,
  pickedEmotions,
  pickedPeople,
  onToggleEmotion,
  onTogglePerson,
  onClose,
}: {
  open: "emotions" | "people" | null;
  people: Person[];
  pickedEmotions: ReadonlySet<string>;
  pickedPeople: ReadonlySet<string>;
  onToggleEmotion: (key: string) => void;
  onTogglePerson: (id: string) => void;
  onClose: () => void;
}) => (
  <>
    <QuickCheckInPickerSheet
      visible={open === "emotions"}
      title={t("emotions")}
      items={open === "emotions" ? getEmotionItems() : []}
      selected={pickedEmotions}
      onToggle={onToggleEmotion}
      onClose={onClose}
    />
    <QuickCheckInPickerSheet
      visible={open === "people"}
      title={t("people")}
      items={open === "people" ? getPeopleItems(people) : []}
      selected={pickedPeople}
      onToggle={onTogglePerson}
      onClose={onClose}
    />
  </>
);
