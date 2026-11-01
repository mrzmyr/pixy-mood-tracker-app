import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { v4 as uuidv4 } from "uuid";
import RouteModalHeader from "@/components/route-modal-header";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/use-colors";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import TagCategoryPicker from "../components/tag-category-picker";
import { ColorPicker } from "../components/color-picker";
import { GENERAL_CATEGORY_ID } from "../tag-categories";
import TagNameField from "../components/tag-name-field";
import { isValidTagTitle } from "../tag-name";
import { useTagsUpdater } from "../tags-provider";
import type { Tag as ITag } from "../tags-provider";

const REGEX_EMOJI = /\p{Emoji}/u;

/**
 * New tag form. Titles must be {@link MIN_TAG_LENGTH} to
 * {@link MAX_TAG_LENGTH} characters; the color defaults to the first tag
 * color.
 */
export const TagCreate = () => {
  const router = useRouter();
  const colors = useColors();
  const analytics = useAnalytics();
  const tagsUpdater = useTagsUpdater();

  const [firstColor] = Object.keys(colors.tags);
  const [submitted, setSubmitted] = useState(false);
  const [tempTag, setTempTag] = useState<ITag>({
    id: uuidv4(),
    title: "",
    color: firstColor,
    categoryId: GENERAL_CATEGORY_ID,
  });

  const isDirty =
    tempTag.title !== "" ||
    tempTag.color !== firstColor ||
    tempTag.categoryId !== GENERAL_CATEGORY_ID;
  // Back, the swipe-down gesture, and Cancel ask before dropping the form.
  const { allowLeave } = useDiscardGuard({ isDirty });

  const onCreate = () => {
    setSubmitted(true);
    if (!isValidTagTitle(tempTag.title)) {
      return;
    }

    analytics.track("tags:tag_created", {
      title_length: tempTag.title.length,
      color: tempTag.color,
      has_emoji: REGEX_EMOJI.test(tempTag.title),
    });

    setTempTag({
      id: uuidv4(),
      title: "",
      color: firstColor,
      categoryId: GENERAL_CATEGORY_ID,
    });

    tagsUpdater.createTag(tempTag);

    allowLeave();
    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-start",
        backgroundColor: colors.logBackground,
      }}
    >
      <RouteModalHeader
        title={t("create_tag")}
        onClose={() => router.back()}
        closeTestID="tag-cancel"
        confirm={{ label: t("save"), onPress: onCreate, testID: "tag-save" }}
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
          autoFocus
          value={tempTag.title}
          showError={submitted}
          onSubmit={onCreate}
          onChange={(title) => {
            setTempTag((currentTag) => ({ ...currentTag, title }));
          }}
        />
        <ColorPicker
          value={tempTag.color}
          onChange={(color) => {
            setTempTag((currentTag) => ({ ...currentTag, color }));
          }}
        />
        <TagCategoryPicker
          value={tempTag.categoryId ?? GENERAL_CATEGORY_ID}
          onChange={(categoryId) => {
            setTempTag((currentTag) => ({ ...currentTag, categoryId }));
          }}
        />
      </ScrollView>
    </View>
  );
};
