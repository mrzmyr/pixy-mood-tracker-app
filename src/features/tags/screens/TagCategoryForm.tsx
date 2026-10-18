import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { v4 as uuidv4 } from "uuid";
import LinkButton from "@/components/LinkButton";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import RouteModalHeader from "@/components/RouteModalHeader";
import TextInfo from "@/components/TextInfo";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import Alert from "@/lib/Alert";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import TagNameField from "../components/TagNameField";
import { GENERAL_CATEGORY_ID, getGeneralCategoryTitle } from "../tagCategories";
import { isValidTagTitle } from "../tagName";
import { useTagsState, useTagsUpdater } from "../TagsProvider";
import type { TagCategory } from "../TagsProvider";

/**
 * Name form for a tag category. Edit mode adds Delete, except for General,
 * which always exists. Names follow the tag name length limits.
 */
const TagCategoryForm = ({ category }: { category?: TagCategory }) => {
  const router = useRouter();
  const colors = useColors();
  const analytics = useAnalytics();
  const haptics = useHaptics();
  const { tags, categories } = useTagsState();
  const updater = useTagsUpdater();
  const [title, setTitle] = useState(category?.title ?? "");
  const [submitted, setSubmitted] = useState(false);
  const isGeneral = category?.id === GENERAL_CATEGORY_ID;
  const general = getGeneralCategoryTitle(categories);

  const onSave = () => {
    setSubmitted(true);
    const trimmed = title.trim();
    if (!isValidTagTitle(trimmed)) {
      return;
    }
    if (category) {
      analytics.track("tags:category_updated", {
        title_length: trimmed.length,
      });
      updater.updateCategory({ ...category, title: trimmed });
    } else {
      analytics.track("tags:category_created", {
        title_length: trimmed.length,
        categories_count: categories.length + 1,
      });
      updater.createCategory({ id: uuidv4(), title: trimmed });
    }
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
        title={category ? t("tag_category_edit") : t("tag_category_create")}
        onClose={() => router.back()}
        closeTestID="tag-category-cancel"
        action={
          <LinkButton
            onPress={onSave}
            type="primary"
            testID="tag-category-save"
            style={{ fontWeight: "700" }}
          >
            {t("save")}
          </LinkButton>
        }
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
          autoFocus={!category}
          placeholder={t("tag_category_name_placeholder")}
          value={title}
          showError={submitted}
          onChange={setTitle}
        />
        {isGeneral && (
          <TextInfo style={{ paddingHorizontal: 0 }}>
            {t("tag_category_general_info", { general })}
          </TextInfo>
        )}
        {category && !isGeneral && (
          <MenuList style={{ marginTop: 16 }}>
            <MenuListItem
              testID="tag-category-delete"
              title={
                <Text
                  style={{
                    fontSize: 17,
                    textAlign: "center",
                    color: colors.dangerButtonText,
                  }}
                >
                  {t("delete")}
                </Text>
              }
              onPress={() => confirmDelete(category)}
            />
          </MenuList>
        )}
      </ScrollView>
    </View>
  );
};

/** New tag category form. */
export const TagCategoryCreate = () => <TagCategoryForm />;

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
