import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import Trash from "lucide-react-native/icons/trash";
import RouteModalHeader from "@/components/route-modal-header";
import TextInfo from "@/components/text-info";
import useColors from "@/hooks/use-colors";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import useHaptics from "@/hooks/use-haptics";
import Alert from "@/lib/alert";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import TagNameField from "../components/tag-name-field";
import {
  GENERAL_CATEGORY_ID,
  getGeneralCategoryTitle,
} from "../tag-categories";
import { isValidTagTitle } from "../tag-name";
import { useTagsState, useTagsUpdater } from "../tags-provider";
import type { TagCategory } from "../tags-provider";

/**
 * Rename form for a tag category, with Delete except for General, which
 * always exists. Names follow the tag name length limits.
 */
const TagCategoryForm = ({ category }: { category: TagCategory }) => {
  const router = useRouter();
  const colors = useColors();
  const analytics = useAnalytics();
  const haptics = useHaptics();
  const { tags, categories } = useTagsState();
  const updater = useTagsUpdater();
  // Seeded once: `TagCategoryEdit` keys the form by category id.
  const [title, setTitle] = useState(() => category.title);
  const [submitted, setSubmitted] = useState(false);
  const isGeneral = category.id === GENERAL_CATEGORY_ID;
  const general = getGeneralCategoryTitle(categories);
  // Back, the swipe-down gesture, and Cancel ask before dropping the name.
  const { allowLeave } = useDiscardGuard({
    isDirty: title !== category.title,
  });

  const onSave = () => {
    setSubmitted(true);
    const trimmed = title.trim();
    if (!isValidTagTitle(trimmed)) {
      return;
    }
    analytics.track("tags:category_updated", {
      title_length: trimmed.length,
    });
    updater.updateCategory({ ...category, title: trimmed });
    allowLeave();
    router.back();
  };

  const confirmDelete = (toDelete: TagCategory) => {
    Alert.alert(
      t("tag_category_delete_confirm_title"),
      t("tag_category_delete_confirm_message", { general }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            void haptics.impact();
            analytics.track("tags:category_deleted", {
              // Matches the count on the categories list: archived tags excluded.
              tags_count: tags.filter(
                (tag) => tag.categoryId === toDelete.id && !tag.isArchived
              ).length,
              categories_count: categories.length - 1,
            });
            updater.deleteCategory(toDelete.id);
            allowLeave();
            router.back();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <RouteModalHeader
        title={t("tag_category_edit")}
        onClose={() => router.back()}
        closeTestID="tag-category-cancel"
        confirm={{
          label: t("save"),
          onPress: onSave,
          testID: "tag-category-save",
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
      >
        <TagNameField
          testID="tag-category-name"
          placeholder={t("tag_category_name_placeholder")}
          value={title}
          showError={submitted}
          onSubmit={onSave}
          onChange={setTitle}
        />
        {isGeneral && (
          <TextInfo style={{ paddingHorizontal: 0 }}>
            {t("tag_category_general_info", { general })}
          </TextInfo>
        )}
        {!isGeneral && (
          <MenuList style={{ marginTop: 16 }}>
            <MenuListItem
              testID="tag-category-delete"
              title={t("delete")}
              tone="destructive"
              iconLeft={<Trash size={24} color={colors.danger} />}
              onPress={() => confirmDelete(category)}
            />
          </MenuList>
        )}
      </ScrollView>
    </View>
  );
};

/**
 * Rename or delete a tag category. Renders nothing for an unknown `id`, for
 * example while the screen closes after Delete.
 */
export const TagCategoryEdit = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories } = useTagsState();
  const category = categories.find((item) => item.id === id);

  return category ? (
    <TagCategoryForm key={category.id} category={category} />
  ) : null;
};
