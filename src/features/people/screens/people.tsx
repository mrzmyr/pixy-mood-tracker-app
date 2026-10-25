import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import sortBy from "lodash/sortBy";
import Archive from "lucide-react-native/icons/archive";
import type { ReactNode } from "react";
import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import useColors from "@/hooks/use-colors";
import { matchesSearch } from "@/lib/search";
import { t } from "@/lib/translation";
import { SFIcon } from "@/components/sf-icon";
import { getPeopleLimit } from "../people-limit";
import { PeopleList } from "../components/people-list";
import { SortablePeopleList } from "../components/sortable-people-list";
import { usePeopleState } from "../people-provider";

const IS_IOS = Platform.OS === "ios";

/** Add button pinned above the bottom inset; hidden at `MAX_PEOPLE`. */
const AddPersonButton = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { people } = usePeopleState();

  if (getPeopleLimit(people).reached) {
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
 * Settings > Check-in > People: `header` (the step switch), then a link to
 * archived people and the active people while `isListVisible`. Reachable
 * only while the `people` feature flag is on.
 *
 * Like Settings > Tags: tap a person to edit, drag the handle to reorder.
 * iOS: large title, search on pull-down, Liquid Glass plus in the bar. The
 * list is the screen's first child, else iOS does not collapse the title.
 * Android and web keep the bottom Add button.
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
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { people } = usePeopleState();
  const [query, setQuery] = useState("");
  const active = people.filter((person) => !person.isArchived);
  const limitReached = getPeopleLimit(people).reached;
  const isSearching = query.trim() !== "";
  const results = active.filter((person) => matchesSearch(person.name, query));

  return (
    <>
      <Animated.ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingBottom: (IS_IOS ? 32 : 120) + (IS_IOS ? 0 : insets.bottom),
        }}
      >
        {!isSearching && header}
        {isListVisible && !isSearching && (
          <View style={{ marginTop: 16, marginHorizontal: 16 }}>
            <MenuList>
              <MenuListItem
                title={t("people_archive")}
                iconLeft={
                  <SFIcon
                    name="archivebox"
                    color={colors.text}
                    fallback={<Archive size={20} color={colors.text} />}
                  />
                }
                isLink
                onPress={() => router.push("/settings/steps/people/archive")}
                testID="people-archive"
              />
            </MenuList>
          </View>
        )}
        {isListVisible &&
          (isSearching || active.length === 0 ? (
            <PeopleList
              people={results}
              limitReached={limitReached}
              emptyText={
                isSearching ? t("people_search_empty") : t("people_empty")
              }
            />
          ) : (
            <>
              {limitReached && (
                <PeopleList people={[]} limitReached emptyText="" />
              )}
              <SortablePeopleList people={active} scrollRef={scrollRef} />
            </>
          ))}
      </Animated.ScrollView>
      {isListVisible && IS_IOS && (
        <>
          <Stack.Screen
            options={{
              headerSearchBarOptions: {
                placeholder: t("people_search"),
                autoCapitalize: "none",
                // Hidden until the list is pulled down, like Settings > Tags.
                hideWhenScrolling: true,
                obscureBackground: false,
                placement: "stacked",
                tintColor: colors.tint,
                textColor: colors.text,
                hintTextColor: colors.textSecondary,
                headerIconColor: colors.text,
                onChangeText: (event) => setQuery(event.nativeEvent.text),
                onCancelButtonPress: () => setQuery(""),
                onClose: () => setQuery(""),
              },
            }}
          />
          {/* Title doubles as label: expo-router drops `accessibilityLabel`
              on iOS bar items. With an icon, iOS shows only the icon. */}
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="plus"
              accessibilityLabel={t("people_add")}
              disabled={limitReached}
              onPress={() => router.push("/people/create")}
            >
              {t("people_add")}
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        </>
      )}
      {isListVisible && !IS_IOS && <AddPersonButton />}
    </>
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
          limitReached={false}
          emptyText={t("people_archive_empty")}
        />
        <View style={{ width: "100%", height: insets.bottom + 56 }} />
      </ScrollView>
    </View>
  );
};
