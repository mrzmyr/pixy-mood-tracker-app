import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  CreateTagAction,
  TagCategoryList,
  TagLimitNotice,
  TagList,
  useCanCreateTag,
  useTagsState,
} from "@/features/tags";
import { SFIcon } from "@/components/sf-icon";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";

import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import { t } from "@/lib/translation";
import sortBy from "lodash/sortBy";
import Archive from "lucide-react-native/icons/archive";
import Folder from "lucide-react-native/icons/folder";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StepSwitch } from "../../components/step-switch";
import { useStepEnabled } from "../../use-step-enabled";

const IS_IOS = Platform.OS === "ios";

const TagScrollView = IS_IOS ? View : ScrollView;

/**
 * Active tags grouped by category, with a native header search bar. Own
 * component so the query resets when the tags step turns off.
 *
 * iOS: the search bar hides until the list is pulled down, and Create Tag
 * is a plus button in the bar. Android and web keep the bottom button.
 */
const SearchableTagList = () => {
  const router = useRouter();
  const colors = useColors();
  const { tags } = useTagsState();
  const [query, setQuery] = useState("");
  const canCreate = useCanCreateTag(tags);

  return (
    <>
      <TagCategoryList
        query={query}
        hasBottomBar={!IS_IOS}
        header={
          <>
            <StepSwitch step="tags" />
            {IS_IOS && !canCreate && (
              <View style={{ marginTop: 16, marginHorizontal: 16 }}>
                <TagLimitNotice tags={tags} />
              </View>
            )}
            <View
              style={{
                marginTop: 16,
                marginHorizontal: 16,
              }}
            >
              <MenuList>
                <MenuListItem
                  testID="tag-categories-link"
                  title={t("tag_categories")}
                  iconLeft={
                    <SFIcon
                      name="folder"
                      color={colors.text}
                      fallback={<Folder size={20} color={colors.text} />}
                    />
                  }
                  isLink
                  onPress={() => {
                    router.push("/tags/categories");
                  }}
                />
                <MenuListItem
                  title={t("archive_tag")}
                  iconLeft={
                    <SFIcon
                      name="archivebox"
                      color={colors.text}
                      fallback={<Archive size={20} color={colors.text} />}
                    />
                  }
                  isLink
                  onPress={() => {
                    router.push("/settings/steps/tags/archive");
                  }}
                />
              </MenuList>
            </View>
          </>
        }
      />
      {/* Header items after the list: iOS tracks the first subview for the
          large title and search bar, so the list must come first. */}
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: t("log_tags_search"),
            autoCapitalize: "none",
            // Hidden until the list is pulled down, like iOS Settings.
            hideWhenScrolling: true,
            // Filters in place; results stay tappable while typing.
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
      {IS_IOS ? (
        // Title doubles as label: expo-router drops `accessibilityLabel` on
        // iOS bar items. With an icon, iOS shows only the icon.
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="plus"
            accessibilityLabel={t("create_tag")}
            disabled={!canCreate}
            onPress={() => router.push("/tags/create")}
          >
            {t("create_tag")}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : (
        <CreateTagAction tags={tags} />
      )}
    </>
  );
};

/**
 * Settings > Check-in > Tags: the step switch, links to categories and
 * archived tags, then active tags grouped by category while the step is on.
 * Archived tags still count toward `MAX_TAGS`; the bottom bar shows a notice
 * instead of the create button at the cap.
 */
export const SettingsTags = () => {
  const colors = useColors();
  const { enabled } = useStepEnabled("tags");

  // No wrapper view: the list must be the screen's first child, else iOS
  // does not collapse the large title and the search bar on scroll.
  return enabled ? (
    <SearchableTagList />
  ) : (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <StepSwitch step="tags" />
      </ScrollView>
      <Stack.Screen options={{ headerSearchBarOptions: undefined }} />
    </>
  );
};

/** Archived tags, sorted by title; rows open the tag editor to unarchive. */
export const SettingsTagsArchive = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState();

  const _tags = sortBy(
    tags.filter((tag: Tag) => tag.isArchived),
    "title"
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TagScrollView style={{ flex: 1 }}>
        <TagList tags={_tags} emptyMessage={t("tags_archive_empty")} />
        {Platform.OS !== "ios" && (
          <View style={{ height: insets.bottom + 56 }} />
        )}
      </TagScrollView>
    </View>
  );
};
