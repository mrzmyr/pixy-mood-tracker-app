import { Text, View } from "react-native";
import sortBy from "lodash/sortBy";
import { useRouter } from "expo-router";
import MenuList from "@/components/MenuList";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useTagsState } from "../TagsProvider";
import type { Tag } from "../TagsProvider";
import { TagListItem } from "./TagListItem";

/** Archived tags, sorted by title; rows open the tag editor to unarchive. */
export const ArchivedTagList = () => {
  const router = useRouter();
  const colors = useColors();
  const { tags } = useTagsState();

  const _tags = sortBy(
    tags.filter((tag: Tag) => tag.isArchived),
    "title"
  );

  const onEdit = (tag: Tag) => {
    router.push({ pathname: "/tags/[id]", params: { id: tag.id } });
  };

  return (
    <View
      style={{
        paddingTop: 16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {_tags.length < 1 && (
        <View
          style={{
            padding: 32,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
            }}
          >
            {t("tags_archive_empty")}
          </Text>
        </View>
      )}
      <MenuList
        style={{
          marginBottom: 40,
        }}
      >
        {_tags.map((tag, index) => (
          <TagListItem
            key={tag.id}
            tag={tag}
            isLast={index === _tags.length - 1}
            onPress={() => onEdit(tag)}
          />
        ))}
      </MenuList>
    </View>
  );
};
