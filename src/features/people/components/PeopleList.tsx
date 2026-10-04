import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import MenuList from "@/components/MenuList";
import { MAX_PEOPLE } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { Person } from "../PeopleProvider";
import { PersonListItem } from "./PersonListItem";

/**
 * People list for the people screens; rows open the person editor. Shows a
 * notice once {@link MAX_PEOPLE} is reached and `emptyText` without rows.
 */
export const PeopleList = ({
  people,
  totalCount,
  emptyText,
}: {
  people: Person[];
  /** Active plus archived people; archived people count toward the limit. */
  totalCount: number;
  emptyText: string;
}) => {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={{ backgroundColor: colors.background }}>
      {totalCount >= MAX_PEOPLE && (
        <View
          style={{
            backgroundColor: colors.cardBackground,
            padding: 16,
            marginTop: 16,
            marginHorizontal: 16,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 17 }}>
            {t("people_reached_max", { max_count: MAX_PEOPLE })}
          </Text>
        </View>
      )}
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        {people.length === 0 && (
          <View
            style={{
              padding: 32,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
              {emptyText}
            </Text>
          </View>
        )}
        <MenuList style={{ marginBottom: 40 }}>
          {people.map((person) => (
            <PersonListItem
              key={person.id}
              person={person}
              onPress={() =>
                router.push({
                  pathname: "/people/[id]",
                  params: { id: person.id },
                })
              }
            />
          ))}
        </MenuList>
      </View>
    </View>
  );
};
