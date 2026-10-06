import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { useTagActions } from "../useTagActions";
import DismissKeyboard from "@/components/DismisKeyboard";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import TagColorPicker from "../components/TagColorPicker";
import TagNameField from "../components/TagNameField";
import { isValidTagTitle } from "../tagName";
import { useTagsState, useTagsUpdater } from "../TagsProvider";
import type { Tag as ITag } from "../TagsProvider";

import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import Toggle from "@/components/Toggle";
import TextInfo from "@/components/TextInfo";

const REGEX_EMOJI = /\p{Emoji}/u;

/**
 * Edit, archive, or delete a tag. Deleting also removes the tag from all
 * entries. An unknown `id` opens an empty form.
 */
export const TagEdit = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tagState = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const analytics = useAnalytics();

  const tagExists = tagState.tags.find((tag) => tag.id === id);
  const defaultTag: ITag = tagExists || {
    id: uuidv4(),
    title: "",
    color: "slate",
  };

  const [submitted, setSubmitted] = useState(false);
  const [tag, setTag] = useState(tagExists || defaultTag);

  const { confirmDelete } = useTagActions({ onDeleted: () => router.back() });

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
    });
    tagsUpdater.updateTag(updatedTag);
    router.back();
  };

  return (
    <DismissKeyboard>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-start",
          backgroundColor: colors.background,
          marginTop: Platform.OS === "android" ? insets.top : 0,
        }}
      >
        <ModalHeader
          title={t("edit_tag")}
          left={
            <LinkButton
              onPress={() => {
                router.back();
              }}
              type="primary"
            >
              {t("cancel")}
            </LinkButton>
          }
          right={
            <LinkButton
              onPress={() => onSubmit(tag)}
              type="primary"
              testID="tag-save"
              style={{ fontWeight: "700" }}
            >
              {t("save")}
            </LinkButton>
          }
        />
        <View
          style={{
            flex: 1,
            padding: 20,
          }}
        >
          <TagNameField
            value={tag.title}
            showError={submitted}
            onChange={(title) => {
              setTag((currentTag) => ({ ...currentTag, title }));
            }}
          />
          <TagColorPicker
            value={tag.color}
            onChange={(color) => {
              setTag((currentTag) => ({ ...currentTag, color }));
            }}
          />
          <MenuList
            style={{
              marginTop: 16,
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
          <TextInfo>{t("archive_tag_description")}</TextInfo>

          {Platform.OS === "ios" ? (
            <MenuList style={{ marginTop: 32 }}>
              <MenuListItem
                testID="tag-delete"
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
                onPress={() => confirmDelete(tag)}
              />
            </MenuList>
          ) : (
            <LinkButton
              testID="tag-delete"
              onPress={() => confirmDelete(tag)}
              style={{
                marginTop: 32,
                alignSelf: "center",
                color: colors.dangerButtonText,
              }}
            >
              {t("delete")}
            </LinkButton>
          )}
        </View>
      </View>
    </DismissKeyboard>
  );
};
