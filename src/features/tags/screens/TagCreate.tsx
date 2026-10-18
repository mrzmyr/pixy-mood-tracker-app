import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { v4 as uuidv4 } from "uuid";
import LinkButton from "@/components/LinkButton";
import RouteModalHeader from "@/components/RouteModalHeader";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import TagCategoryPicker from "../components/TagCategoryPicker";
import { ColorPicker } from "../components/ColorPicker";
import { GENERAL_CATEGORY_ID } from "../tagCategories";
import TagNameField from "../components/TagNameField";
import { isValidTagTitle } from "../tagName";
import { useTagsUpdater } from "../TagsProvider";
import type { Tag as ITag } from "../TagsProvider";

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

  const [submitted, setSubmitted] = useState(false);
  const [tempTag, setTempTag] = useState<ITag>({
    id: uuidv4(),
    title: "",
    color: Object.keys(colors.tags)[0],
    categoryId: GENERAL_CATEGORY_ID,
  });

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
      color: Object.keys(colors.tags)[0],
      categoryId: GENERAL_CATEGORY_ID,
    });

    tagsUpdater.createTag(tempTag);

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
        action={
          <LinkButton
            onPress={onCreate}
            type="primary"
            testID="tag-save"
            style={{ fontWeight: "700" }}
          >
            {t("save")}
          </LinkButton>
        }
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
          value={tempTag.title}
          showError={submitted}
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
