import { getSlideMarginTop } from "./marginTop";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useTagsState, TagComponent as Tag } from "@/features/tags";
import { useLogDraft } from "../logDraft";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import { MiniButton } from "@/components/MiniButton";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";
import noop from "lodash/noop";

/**
 * Tag picker slide. Archived tags are hidden unless the draft already has
 * them.
 */
export const SlideTags = ({
  onDisableStep = noop,
  showDisable,
}: {
  onDisableStep?: () => void;
  showDisable: boolean;
}) => {
  const { draft, setTags } = useLogDraft();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { tags } = useTagsState();

  const selectedTagIds = new Set(draft.tags.map((d) => d.id));

  const _tags = tags.filter((tag) => {
    const isSelected = selectedTagIds.has(tag.id);

    return (
      (!isSelected && !tag.isArchived) ||
      (isSelected && tag.isArchived) ||
      (isSelected && !tag.isArchived)
    );
  });

  const marginTop = getSlideMarginTop();

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
        <ScrollView
          style={{
            flex: 1,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              marginTop: 24,
            }}
          >
            {_tags?.map((tag) => (
              <Tag
                onPress={() => {
                  setTags(
                    selectedTagIds.has(tag.id)
                      ? draft.tags.filter(
                          (selectedTag) => selectedTag.id !== tag.id
                        )
                      : [...draft.tags, tag]
                  );
                }}
                onLongPress={() =>
                  router.push({
                    pathname: "/tags/[id]",
                    params: { id: tag.id },
                  })
                }
                title={tag.title}
                colorName={tag.color}
                selected={selectedTagIds.has(tag.id)}
                key={tag.id}
              />
            ))}
            <View>
              <MiniButton
                onPress={() => {
                  router.push("/tags");
                }}
              >
                {t("tags_edit")}
              </MiniButton>
            </View>
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
