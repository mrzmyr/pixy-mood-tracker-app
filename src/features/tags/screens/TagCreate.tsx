import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import Button from "@/components/Button";
import DismissKeyboard from "@/components/DismisKeyboard";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from "@/constants/Config";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { useTagsUpdater } from "../TagsProvider";
import type { Tag as ITag } from "../TagsProvider";

import { ColorPicker } from "../components/ColorPicker";

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

  const [tempTag, setTempTag] = useState<ITag>({
    id: uuidv4(),
    title: "",
    color: Object.keys(colors.tags)[0],
  });

  const onCreate = () => {
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
            <LinkButton
              onPress={() => {
                router.back();
              }}
              type="primary"
            >
              {t("cancel")}
            </LinkButton>
          }
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          contentContainerStyle={{
            padding: 20,
          }}
        >
          <TextInput
            accessibilityLabel={t("tags_add_placeholder")}
            testID="tag-name"
            autoCorrect={false}
            style={{
              fontSize: 17,
              color: colors.textInputText,
              backgroundColor: colors.textInputBackground,
              width: "100%",
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
            }}
            placeholder={t("tags_add_placeholder")}
            placeholderTextColor={colors.textInputPlaceholder}
            maxLength={MAX_TAG_LENGTH}
            value={tempTag.title}
            onChangeText={(text) => {
              setTempTag((currentTag) => ({
                ...currentTag,
                title: text,
              }));
            }}
          />
          <ColorPicker
            value={tempTag.color}
            onChange={(color) => {
              setTempTag((currentTag) => ({ ...currentTag, color }));
            }}
          />
          <Button
            style={{
              marginTop: 32,
            }}
            onPress={onCreate}
            disabled={
              tempTag.title.length < MIN_TAG_LENGTH ||
              tempTag.title.length > MAX_TAG_LENGTH
            }
          >
            {t("create")}
          </Button>
          <View style={{ height: insets.bottom }} />
        </ScrollView>
      </View>
    </DismissKeyboard>
  );
};
