import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { PersonChip, usePeopleState } from "@/features/people";
import { t } from "@/lib/translation";
import { SectionHeader } from "./SectionHeader";

/**
 * People section of an entry card; editing opens the logger at the people
 * step. References without a matching person are skipped. Stored people
 * always show, also with the pencil off.
 */
export const People = ({
  item,
  canEdit,
}: {
  item: LogItem;
  /** Shows the pencil; off when the edit logger has no people step. */
  canEdit: boolean;
}) => {
  const colors = useColors();
  const { people } = usePeopleState();
  const router = useRouter();

  const known = item.people.flatMap((reference) => {
    const person = people.find((candidate) => candidate.id === reference.id);
    return person ? [person] : [];
  });

  return (
    <View>
      <SectionHeader
        title={t("people")}
        editTestID="log-list-people-edit"
        onEdit={
          canEdit
            ? () => {
                router.push({
                  pathname: "/logs/[id]/edit",
                  params: { id: item.id, step: "people" },
                });
              }
            : undefined
        }
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {known.length > 0 ? (
          known.map((person) => (
            <PersonChip
              key={person.id}
              person={person}
              style={{
                backgroundColor: colors.entryBackground,
                borderColor: colors.entryItemBorder,
              }}
            />
          ))
        ) : (
          <View
            style={{ paddingTop: 4, paddingBottom: 8, paddingHorizontal: 8 }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 17 }}>
              {t("view_log_people_empty")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
