import { useRouter } from "expo-router";
import Folder from "lucide-react-native/icons/folder";
import { View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import RouteModalHeader from "@/components/RouteModalHeader";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { CreateTagAction } from "../../components/CreateTagAction";
import { TagCategoryList } from "../../components/TagCategoryList";
import { useTagsState } from "../../TagsProvider";

/**
 * Tag manager modal opened from the logger's tag slide: active tags grouped
 * by category, plus a link to manage categories. Archived tags are hidden
 * here but still count toward `MAX_TAGS`.
 */
export const Tags = () => {
  const router = useRouter();
  const colors = useColors();
  const { tags } = useTagsState();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-start",
        backgroundColor: colors.background,
      }}
    >
      <RouteModalHeader
        title={t("tags")}
        onClose={() => router.back()}
        closeTestID="tags-close"
      />
      <CreateTagAction tags={tags} />
      <TagCategoryList
        header={
          <View style={{ marginTop: 8, marginHorizontal: 16 }}>
            <MenuList>
              <MenuListItem
                testID="tag-categories-link"
                title={t("tag_categories")}
                iconLeft={<Folder size={20} color={colors.text} />}
                isLink
                onPress={() => router.push("/tags/categories")}
              />
            </MenuList>
          </View>
        }
      />
    </View>
  );
};
