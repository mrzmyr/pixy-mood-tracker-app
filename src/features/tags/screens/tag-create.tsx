import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { v4 as uuidv4 } from "uuid";
import FlagHighlight from "@/components/flag-highlight";
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
import { useTagsUpdater } from "../tags-provider";
import type { Tag as ITag } from "../tags-provider";

const REGEX_EMOJI = /\p{Emoji}/u;

/**
 * New tag form. Titles must be {@link MIN_TAG_LENGTH} to
 * {@link MAX_TAG_LENGTH} characters; the color defaults to the first tag
 * color. Flag `tag-icons`: an icon box leads the name field and suggests an
 * icon for the name; color moves into the icon picker.
 */
export const TagCreate = () => {
  const router = useRouter();
  const colors = useColors();
  const analytics = useAnalytics();
  const tagsUpdater = useTagsUpdater();
  const hasTagIcons = useFeatureFlag("tag-icons");

  const [firstColor] = Object.keys(colors.tags);
  const [submitted, setSubmitted] = useState(false);
  const [tempTag, setTempTag] = useState<ITag>({
    id: uuidv4(),
    title: "",
    color: firstColor,
    categoryId: GENERAL_CATEGORY_ID,
  });

  const setIcon = useCallback(
    (icon: TagIconKey) => setTempTag((currentTag) => ({ ...currentTag, icon })),
    []
  );
  // Unset: the guess for the name, else the first color.
  const [pickedColor, setPickedColor] = useState<ITag["color"]>();
  const setColor = useCallback((color: ITag["color"]) => {
    setPickedColor(color);
    setTempTag((currentTag) => ({ ...currentTag, color }));
  }, []);
  const iconField = useTagIconField({
    enabled: hasTagIcons,
    suggestFor: tempTag.title,
    title: tempTag.title,
    pickedIcon: tempTag.icon,
    pickedColor,
    defaultColor: firstColor,
    onIconPick: setIcon,
    onColorPick: setColor,
  });

  const isDirty =
    tempTag.title !== "" ||
    tempTag.icon !== undefined ||
    pickedColor !== undefined ||
    tempTag.categoryId !== GENERAL_CATEGORY_ID;
  // Back, the swipe-down gesture, and Cancel ask before dropping the form.
  const { allowLeave } = useDiscardGuard({ isDirty });

  const onCreate = () => {
    setSubmitted(true);
    if (!isValidTagTitle(tempTag.title)) {
      return;
    }

    const tag: ITag = hasTagIcons
      ? {
          ...tempTag,
          color: iconField.color,
          ...(iconField.icon && { icon: iconField.icon }),
        }
      : tempTag;

    analytics.track("tags:tag_created", {
      title_length: tag.title.length,
      color: tag.color,
      has_emoji: REGEX_EMOJI.test(tag.title),
      ...(hasTagIcons && {
        icon: iconField.icon ?? null,
        icon_source: iconField.iconSource,
        color_source: iconField.colorSource,
      }),
    });

    setPickedColor(undefined);
    setTempTag({
      id: uuidv4(),
      title: "",
      color: firstColor,
      categoryId: GENERAL_CATEGORY_ID,
    });

    tagsUpdater.createTag(tag);

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
          leading={
            hasTagIcons ? (
              <FlagHighlight flag="tag-icons">
                <TagIconButton
                  icon={iconField.icon}
                  color={iconField.color}
                  isSuggesting={iconField.isSuggesting}
                  onPress={() => {
                    analytics.track("tags:icon_picker_opened", {
                      has_suggestions: tempTag.title.trim() !== "",
                    });
                    iconField.openPicker();
                  }}
                />
              </FlagHighlight>
            ) : undefined
          }
          autoFocus
          value={tempTag.title}
          showError={submitted}
          onSubmit={onCreate}
          onChange={(title) => {
            setTempTag((currentTag) => ({ ...currentTag, title }));
          }}
        />
        {!hasTagIcons && (
          <ColorPicker value={tempTag.color} onChange={setColor} />
        )}
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
