import { useRouter } from "expo-router";
import { Folder } from "lucide-react-native";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloseButton } from "@/components/CloseButton";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import ModalHeader from "@/components/ModalHeader";
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
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-start",
        backgroundColor: colors.background,
        marginTop: Platform.OS === "android" ? insets.top : 0,
      }}
    >
      <ModalHeader
        title={t("tags")}
        right={
          <CloseButton testID="tags-close" onPress={() => router.back()} />
        }
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
