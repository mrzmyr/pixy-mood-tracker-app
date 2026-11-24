import { useSlideMarginTop } from "./margin-top";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import type { Tag } from "@/features/tags";
import { useLogDraft } from "../log-draft";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/link-button";
import { SlideHeadline } from "../components/slide-headline";
import { TagPicker } from "../components/tag-picker";
import { Footer } from "./footer";
import noop from "lodash/noop";

/** Tag picker slide: {@link TagPicker} under a headline. */
export const SlideTags = ({
  onDisableStep = noop,
  showDisable,
}: {
  onDisableStep?: () => void;
  showDisable: boolean;
}) => {
  const { draft, setTags } = useLogDraft();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  // A chip drag must not scroll the list under the finger.
  const [isDraggingTag, setIsDraggingTag] = useState(false);

  const selectedTagIds = new Set(draft.tags.map((d) => d.id));

  const deselect = (id: Tag["id"]) =>
    setTags(draft.tags.filter((selectedTag) => selectedTag.id !== id));

  const toggle = (tag: Tag) =>
    selectedTagIds.has(tag.id)
      ? deselect(tag.id)
      : setTags([...draft.tags, tag]);

  const marginTop = useSlideMarginTop();

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        paddingHorizontal: 20,
        marginTop,
      }}
    >
      <SlideHeadline>{t("log_tags_question")}</SlideHeadline>
      <View
        style={{
          position: "relative",
          flex: 1,
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[colors.logBackground, colors.logBackgroundTransparent]}
          style={{
            position: "absolute",
            height: 24,
            top: 0,
            zIndex: 1,
            width: "100%",
          }}
        />
        <ScrollView style={{ flex: 1 }} scrollEnabled={!isDraggingTag}>
          <View style={{ marginTop: 24 }}>
            <TagPicker
              selectedIds={selectedTagIds}
              onToggle={toggle}
              onDeselect={deselect}
              onDragChange={setIsDraggingTag}
            />
          </View>
          {showDisable && (
            <Footer>
              <LinkButton
                type="secondary"
                onPress={onDisableStep}
                style={{
                  fontWeight: "400",
                }}
              >
                {t("log_tags_disable")}
              </LinkButton>
            </Footer>
          )}
          {/* Keep final actions above the 54 pt Next button and its spacing. */}
          <View style={{ height: insets.bottom + 54 + 32 }} />
        </ScrollView>
      </View>
    </View>
  );
};
