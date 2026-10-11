import { useRouter } from "expo-router";
import {
  CreateTagAction,
  TagCategoryList,
  TagList,
  useTagsState,
} from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";

import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { t } from "@/lib/translation";
import sortBy from "lodash/sortBy";
import { Archive, Folder } from "lucide-react-native";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StepSwitch } from "../../components/StepSwitch";
import { useStepEnabled } from "../../useStepEnabled";

const TagScrollView = Platform.OS === "ios" ? View : ScrollView;

/**
 * Settings > Check-in > Tags: the step switch, links to categories and
 * archived tags, then active tags grouped by category while the step is on.
 * Archived tags still count toward `MAX_TAGS`; the bottom bar shows a notice
 * instead of the create button at the cap.
 */
export const SettingsTags = () => {
  const router = useRouter();
  const colors = useColors();
  const { tags } = useTagsState();
  const { enabled } = useStepEnabled("tags");

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {enabled && <CreateTagAction tags={tags} />}
      {enabled ? (
        <TagCategoryList
          header={
            <>
              <StepSwitch step="tags" />
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
                    iconLeft={<Folder size={20} color={colors.text} />}
                    isLink
                    onPress={() => {
                      router.push("/tags/categories");
                    }}
                  />
                  <MenuListItem
                    title={t("archive_tag")}
                    iconLeft={<Archive size={20} color={colors.text} />}
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
      ) : (
        <ScrollView>
          <StepSwitch step="tags" />
        </ScrollView>
      )}
    </View>
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
