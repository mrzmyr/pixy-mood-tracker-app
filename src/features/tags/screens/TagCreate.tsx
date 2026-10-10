import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import DismissKeyboard from "@/components/DismisKeyboard";
import { EditActionButton } from "@/components/EditActionButton";
import ModalHeader from "@/components/ModalHeader";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import TagColorPicker from "../components/TagColorPicker";
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
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const tagsUpdater = useTagsUpdater();

  const [submitted, setSubmitted] = useState(false);
  const [tempTag, setTempTag] = useState<ITag>({
    id: uuidv4(),
    title: "",
    color: Object.keys(colors.tags)[0],
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
    });

    tagsUpdater.createTag(tempTag);

    router.back();
  };

  return (
    <DismissKeyboard>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-start",
          backgroundColor: colors.logBackground,
          marginTop: Platform.OS === "android" ? insets.top : 0,
        }}
      >
        <ModalHeader
          title={t("create_tag")}
          left={
            <EditActionButton
              action="cancel"
              label={t("cancel")}
              testID="tag-cancel"
              onPress={() => router.back()}
            />
          }
          right={
            <EditActionButton
              action="save"
              label={t("save")}
              testID="tag-save"
              onPress={onCreate}
            />
          }
        />
        <View
          style={{
            flex: 1,
            padding: 20,
          }}
        >
          <TagNameField
            value={tempTag.title}
            showError={submitted}
            onChange={(title) => {
              setTempTag((currentTag) => ({ ...currentTag, title }));
            }}
          />
          <TagColorPicker
            value={tempTag.color}
            onChange={(color) => {
              setTempTag((currentTag) => ({ ...currentTag, color }));
            }}
          />
        </View>
      </View>
    </DismissKeyboard>
  );
};
