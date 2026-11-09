import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { useTagActions } from "../use-tag-actions";
import RouteModalHeader from "@/components/route-modal-header";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/use-colors";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { useFeatureFlag } from "@/state/feature-flags";
import { TagIconButton } from "../components/tag-icon-button";
import type { TagIconKey } from "../tag-icons";
import { useTagIconField } from "../use-tag-icon-field";
import TagCategoryPicker from "../components/tag-category-picker";
import { ColorPicker } from "../components/color-picker";
import { GENERAL_CATEGORY_ID } from "../tag-categories";
import TagNameField from "../components/tag-name-field";
import { isValidTagTitle } from "../tag-name";
import { useTagsState, useTagsUpdater } from "../tags-provider";
import type { Tag as ITag } from "../tags-provider";

import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import Trash from "lucide-react-native/icons/trash";
import Toggle from "@/components/toggle";
import TextInfo from "@/components/text-info";

const REGEX_EMOJI = /\p{Emoji}/u;

/**
 * Edit, archive, or delete a tag. Deleting also removes the tag from all
 * entries. An unknown `id` opens an empty form.
 */
export const TagEdit = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const tagState = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const analytics = useAnalytics();
  const hasTagIcons = useFeatureFlag("tag-icons");

  const tagExists = tagState.tags.find((tag) => tag.id === id);
  const defaultTag: ITag = tagExists || {
    id: uuidv4(),
    title: "",
    color: "slate",
  };

  const [submitted, setSubmitted] = useState(false);
  const [tag, setTag] = useState(tagExists || defaultTag);

  const setIcon = useCallback(
    (icon: TagIconKey) => setTag((currentTag) => ({ ...currentTag, icon })),
    []
  );
  const setColor = useCallback(
    (color: ITag["color"]) =>
      setTag((currentTag) => ({ ...currentTag, color })),
    []
  );
  const iconField = useTagIconField({
    enabled: hasTagIcons,
    // Suggest only after a rename: opening a tag never changes its icon.
    suggestFor: tag.title === defaultTag.title ? "" : tag.title,
    title: tag.title,
    pickedIcon: tag.icon,
    // An existing tag has a color already: no guess.
    pickedColor: tag.color,
    defaultColor: tag.color,
    onIconPick: setIcon,
    onColorPick: setColor,
  });

  const isDirty =
    tag.title !== defaultTag.title ||
    tag.icon !== defaultTag.icon ||
    tag.color !== defaultTag.color ||
    (tag.categoryId ?? GENERAL_CATEGORY_ID) !==
      (defaultTag.categoryId ?? GENERAL_CATEGORY_ID) ||
    Boolean(tag.isArchived) !== Boolean(defaultTag.isArchived);
  // Back, the swipe-down gesture, and Cancel ask before dropping edits.
  const { allowLeave } = useDiscardGuard({ isDirty });

  const { confirmDelete } = useTagActions({
    onDeleted: () => {
      allowLeave();
      router.back();
    },
  });

  const onSubmit = (updatedTag: ITag) => {
    setSubmitted(true);
    if (!isValidTagTitle(updatedTag.title)) {
      return;
    }

    analytics.track("tags:tag_updated", {
      title_length: updatedTag.title.length,
      color: updatedTag.color,
      has_emoji: REGEX_EMOJI.test(updatedTag.title),
      is_archived: Boolean(updatedTag.isArchived),
      ...(hasTagIcons && {
        icon: iconField.icon ?? null,
        icon_source: iconField.iconSource,
      }),
    });
    tagsUpdater.updateTag(
      hasTagIcons && iconField.icon
        ? { ...updatedTag, icon: iconField.icon }
        : updatedTag
    );
    allowLeave();
    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-start",
        backgroundColor: colors.background,
      }}
    >
      <RouteModalHeader
        title={t("edit_tag")}
        onClose={() => router.back()}
        closeTestID="tag-cancel"
        confirm={{
          label: t("save"),
          onPress: () => onSubmit(tag),
          testID: "tag-save",
        }}
      />
      {/* Scrolls once many categories push the form past the screen. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
      >
        <TagNameField
          leading={
            hasTagIcons ? (
              <TagIconButton
                placement="row"
                icon={iconField.icon}
                color={tag.color}
                isSuggesting={iconField.isSuggesting}
                onPress={() => {
                  analytics.track("tags:icon_picker_opened", {
                    has_suggestions: tag.title.trim() !== "",
                  });
                  iconField.openPicker();
                }}
              />
            ) : undefined
          }
          value={tag.title}
          showError={submitted}
          onSubmit={() => onSubmit(tag)}
          onChange={(title) => {
            setTag((currentTag) => ({ ...currentTag, title }));
          }}
        />
        {!hasTagIcons && <ColorPicker value={tag.color} onChange={setColor} />}
        <TagCategoryPicker
          value={tag.categoryId ?? GENERAL_CATEGORY_ID}
          onChange={(categoryId) => {
            setTag((currentTag) => ({ ...currentTag, categoryId }));
          }}
        />
        <MenuList
          style={{
            marginTop: 24,
          }}
        >
          <MenuListItem
            title={t("archive_tag_enabled")}
            iconRight={
              <Toggle
                accessibilityLabel={t("archive_tag_enabled")}
                testID="tag-archived"
                onValueChange={() => {
                  setTag((currentTag) => ({
                    ...currentTag,
                    isArchived: !currentTag.isArchived,
                  }));
                }}
                value={tag.isArchived}
              />
            }
          />
        </MenuList>
        <TextInfo style={{ marginTop: 8 }}>
          {t("archive_tag_description")}
        </TextInfo>

        <MenuList style={{ marginTop: 8 }}>
          <MenuListItem
            testID="tag-delete"
            title={t("delete")}
            tone="destructive"
            iconLeft={<Trash size={24} color={colors.danger} />}
            onPress={() => confirmDelete(tag)}
          />
        </MenuList>
      </ScrollView>
    </View>
  );
};
