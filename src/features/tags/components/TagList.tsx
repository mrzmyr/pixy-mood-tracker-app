import { Text, View } from "react-native";
import MenuList from "@/components/MenuList";
import { MAX_TAGS } from "@/constants/Config";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import type { Tag } from "../TagsProvider";
import { TagListItem } from "./TagListItem";
import { useRouter } from "expo-router";

/**
 * Tag list for the tag settings screens; rows open the tag editor. Shows a
 * notice once {@link MAX_TAGS} is reached.
 */
export const TagList = ({ tags }: { tags: Tag[] }) => {
  const colors = useColors();
  const router = useRouter();

  const onEdit = (tag: Tag) => {
    router.push({ pathname: "/tags/[id]", params: { id: tag.id } });
  };

  return (
    <View
      style={{
        backgroundColor: colors.background,
      }}
    >
      {tags.length >= MAX_TAGS && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            padding: 16,
            marginTop: 16,
            marginHorizontal: 16,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
            }}
          >
            {t("tags_reached_max", { max_count: MAX_TAGS })}
          </Text>
        </View>
      )}
      <View
        style={{
          paddingTop: 16,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {tags.length < 1 && (
          <View
            style={{
              padding: 32,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                opacity: 0.5,
                color: colors.text,
              }}
            >
              {t("tags_empty")}. 👻
            </Text>
          </View>
        )}
        <MenuList
          style={{
            marginBottom: 40,
          }}
        >
          {tags.map((tag) => (
            <TagListItem key={tag.id} tag={tag} onPress={() => onEdit(tag)} />
          ))}
        </MenuList>
      </View>
    </View>
  );
};
