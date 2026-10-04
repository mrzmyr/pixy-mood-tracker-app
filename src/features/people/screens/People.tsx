import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import sortBy from "lodash/sortBy";
import { Archive } from "lucide-react-native";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { MAX_PEOPLE } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { PeopleList } from "../components/PeopleList";
import { usePeopleState } from "../PeopleProvider";

/** Add button pinned above the bottom inset; hidden at {@link MAX_PEOPLE}. */
const AddPersonButton = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { people } = usePeopleState();

  if (people.length >= MAX_PEOPLE) {
    return null;
  }

  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[
          colors.logBackgroundTransparent,
          colors.background,
          colors.background,
        ]}
        style={{
          position: "absolute",
          height: 120 + insets.bottom,
          bottom: 0,
          zIndex: 1,
          width: "100%",
        }}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
          position: "absolute",
          bottom: insets.bottom + 16,
          width: "100%",
          zIndex: 2,
        }}
      >
        <Button
          style={{ marginTop: 16, width: "100%" }}
          onPress={() => router.push("/people/create")}
          testID="people-add"
        >
          {t("people_add")}
        </Button>
      </View>
    </>
  );
};

/**
 * Settings > Check-in > People: `header` (the step switch), then active
 * people and a link to archived ones while `isListVisible`. Reachable only
 * while the `people` feature flag is on.
 */
export const SettingsPeople = ({
  header,
  isListVisible,
}: {
  header?: ReactNode;
  isListVisible: boolean;
}) => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { people } = usePeopleState();
  const active = people.filter((person) => !person.isArchived);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isListVisible && <AddPersonButton />}
      <ScrollView>
        {header}
        {isListVisible && (
          <>
            <View style={{ marginTop: 16, marginHorizontal: 16 }}>
              <MenuList>
                <MenuListItem
                  title={t("people_archive")}
                  iconLeft={<Archive size={20} color={colors.text} />}
                  isLink
                  onPress={() => router.push("/settings/steps/people/archive")}
                  testID="people-archive"
                />
              </MenuList>
            </View>
            <PeopleList
              people={active}
              totalCount={people.length}
              emptyText={t("people_empty")}
            />
            <View style={{ width: "100%", height: insets.bottom + 56 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

/** Archived people, sorted by name; rows open the editor to unarchive. */
export const SettingsPeopleArchive = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { people } = usePeopleState();
  const archived = sortBy(
    people.filter((person) => person.isArchived),
    "name"
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <PeopleList
          people={archived}
          totalCount={0}
          emptyText={t("people_archive_empty")}
        />
        <View style={{ width: "100%", height: insets.bottom + 56 }} />
      </ScrollView>
    </View>
  );
};
