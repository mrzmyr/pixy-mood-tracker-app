import { useRouter } from "expo-router";
import { TagList, useTagsState } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";

import Button from "@/components/Button";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { MAX_TAGS } from "@/constants/Config";
import { t } from "@/lib/translation";
import { LinearGradient } from "expo-linear-gradient";
import sortBy from "lodash/sortBy";
import { Archive } from "lucide-react-native";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TagScrollView = Platform.OS === "ios" ? View : ScrollView;

/**
 * Settings > Tags: active tags plus a link to archived ones. Archived tags
 * still count toward {@link MAX_TAGS}.
 */
export const SettingsTags = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState();

  const _tags = tags.filter((tag: Tag) => !tag.isArchived);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {tags.length < MAX_TAGS && (
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
              style={{
                marginTop: 16,
                width: "100%",
              }}
              onPress={() => {
                router.push("/tags/create");
              }}
            >
              {t("create_tag")}
            </Button>
          </View>
        </>
      )}
      <TagScrollView style={{ flex: 1 }}>
        <TagList
          tags={_tags}
          header={
            <View
              style={{
                marginTop: 16,
                marginHorizontal: 16,
              }}
            >
              <MenuList style={{}}>
                <MenuListItem
                  title={t("archive_tag")}
                  iconLeft={<Archive size={20} color={colors.text} />}
                  isLink
                  isLast
                  onPress={() => {
                    router.push("/settings/tags/archive");
                  }}
                />
              </MenuList>
            </View>
          }
        />
        {Platform.OS !== "ios" && (
          <View style={{ height: insets.bottom + 56 }} />
        )}
      </TagScrollView>
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
