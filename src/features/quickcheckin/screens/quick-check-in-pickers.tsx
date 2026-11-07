import Ellipsis from "lucide-react-native/icons/ellipsis";
import { Pressable, ScrollView, View } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import {
  PersonAvatar,
  PersonChip,
  getLetterSection,
  TILE_RING_GAP,
  TILE_RING_WIDTH,
} from "@/features/people";
import type { Person } from "@/features/people";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { QuickCheckInPickerSheet } from "./quick-check-in-picker-sheet";
import type { PickerItem } from "./quick-check-in-picker-sheet";

/** Avatar diameter in the people row. */
const AVATAR_SIZE = 56;

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
    contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
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

/** Full list of people behind "All" in the people row. */
export const QuickCheckInListSheets = ({
  isOpen,
  people,
  picked,
  onToggle,
  onClose,
}: {
  isOpen: boolean;
  people: Person[];
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
}) => (
  <QuickCheckInPickerSheet
    visible={isOpen}
    title={t("people")}
    items={isOpen ? getPeopleItems(people) : []}
    selected={picked}
    onToggle={onToggle}
    onClose={onClose}
  />
);
