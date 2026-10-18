import { getSlideMarginTop } from "./marginTop";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import {
  groupTagsByCategory,
  useTagsState,
  TagComponent as Tag,
} from "@/features/tags";
import type { Tag as ITag } from "@/features/tags";
import { useLogDraft } from "../logDraft";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import { MiniButton } from "@/components/MiniButton";
import { SlideHeadline } from "../components/SlideHeadline";
import { PullToSearch } from "../components/PullToSearch";
import { matchesSearch } from "@/lib/search";
import { Footer } from "./Footer";
import noop from "lodash/noop";

/**
 * Tag picker slide. Archived tags are hidden unless the draft already has
 * them. Pulling the list down reveals a search by tag title. Tags are grouped
 * by category; headings show only when more than one category has tags, so a
 * single category looks like a plain tag list.
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
  const { tags, categories } = useTagsState();
  const [query, setQuery] = useState("");

  const selectedTagIds = new Set(draft.tags.map((d) => d.id));

  const _tags = tags.filter((tag) => {
    const isSelected = selectedTagIds.has(tag.id);

    return (
      ((!isSelected && !tag.isArchived) ||
        (isSelected && tag.isArchived) ||
        (isSelected && !tag.isArchived)) &&
      matchesSearch(tag.title, query)
    );
  });

  const sections = groupTagsByCategory(_tags, categories).filter(
    (section) => section.tags.length > 0
  );
  const showHeadings = sections.length > 1;

  const marginTop = getSlideMarginTop();

  const renderTag = (tag: ITag) => (
    <Tag
      onPress={() => {
        setTags(
          selectedTagIds.has(tag.id)
            ? draft.tags.filter((selectedTag) => selectedTag.id !== tag.id)
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
  );

  const editButton = (
    <View>
      <MiniButton
        onPress={() => {
          router.push("/tags");
        }}
      >
        {t("tags_edit")}
      </MiniButton>
    </View>
  );

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
        <PullToSearch
          testID="logger-tags-search"
          inset={0}
          placeholder={t("log_tags_search")}
          query={query}
          onChangeQuery={setQuery}
        >
          <View
            style={{
              marginTop: 24,
            }}
          >
            {sections.map(({ category, tags: sectionTags }, index) => (
              <View
                key={category.id}
                testID={`log-tags-category-${category.id}`}
                style={{ marginBottom: showHeadings ? 12 : 0 }}
              >
                {showHeadings && (
                  <Text
                    accessibilityRole="header"
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: 8,
                    }}
                  >
                    {category.title}
                  </Text>
                )}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                  }}
                >
                  {sectionTags.map(renderTag)}
                  {index === sections.length - 1 && editButton}
                </View>
              </View>
            ))}
            {sections.length === 0 && editButton}
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
        </PullToSearch>
      </View>
    </View>
  );
};
