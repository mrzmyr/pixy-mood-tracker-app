import { View } from "react-native";
import TextHeadline from "@/components/TextHeadline";
import { PersonChip } from "@/features/people";
import type { Person } from "@/features/people";
import { t } from "@/lib/translation";

/**
 * People filter chips; `onSelect` receives the tapped person so the parent
 * can toggle them. Entries match when they have any selected person.
 */
export const PeopleSection = ({
  people,
  selectedIds,
  onSelect,
}: {
  people: Person[];
  selectedIds: Set<Person["id"]>;
  onSelect: (person: Person) => void;
}) => (
  <View style={{ marginTop: 16 }}>
    <TextHeadline style={{ marginBottom: 12 }}>{t("people")}</TextHeadline>
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {people.map((person) => (
        <PersonChip
          key={person.id}
          person={person}
          selected={selectedIds.has(person.id)}
          onPress={() => onSelect(person)}
          testID={`filter-person-${person.id}`}
        />
      ))}
    </View>
  </View>
);
