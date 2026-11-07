import { useSlideMarginTop } from "./margin-top";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import {
  groupTagsByCategory,
  useTagsState,
  TagComponent as Tag,
} from "@/features/tags";
import type { Tag as ITag } from "@/features/tags";
import { useLogDraft } from "../log-draft";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/link-button";
import { CollapsibleSection } from "@/components/collapsible-section";
import { MiniButton } from "@/components/mini-button";
import { CHIP_FLOW } from "@/constants/chip";
import { SPACE } from "@/constants/space";
import { useCollapsedSections } from "@/hooks/use-collapsed-sections";
import { SlideHeadline } from "../components/slide-headline";
import { PullToSearch } from "../components/pull-to-search";
import { matchesSearch } from "@/lib/search";
import { Footer } from "./footer";
import noop from "lodash/noop";

/**
 * Tag picker slide. Archived tags are hidden unless the draft already has
 * them. Pulling the list down reveals a search by tag title. Each category
 * with tags is a card: plus adds a tag to it, the chevron folds it away. The
 * folded state stays on the device. A search opens every card.
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
  const isSearching = query.trim() !== "";
  const collapsed = useCollapsedSections();

  const marginTop = useSlideMarginTop();

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
    <View style={{ alignItems: "flex-start" }}>
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
              marginTop: SPACE.xxl,
              gap: SPACE.md,
              paddingBottom: SPACE.md,
            }}
          >
            {sections.map(({ category, tags: sectionTags }) => {
              const key = `tag-category:${category.id}`;
              return (
                <CollapsibleSection
                  key={category.id}
                  testID={`log-tags-category-${category.id}`}
                  title={category.title}
                  isCollapsed={
                    isSearching ? undefined : collapsed.isCollapsed(key)
                  }
                  onToggle={() => collapsed.toggle(key)}
                  onAdd={() =>
                    router.push({
                      pathname: "/tags/create",
                      params: { categoryId: category.id },
                    })
                  }
                  addLabel={t("tags_add")}
                  // Chips pad their right and bottom edge with one gap.
                  contentStyle={{
                    paddingRight: SPACE.sm,
                    paddingBottom: SPACE.sm,
                  }}
                >
                  <View
                    style={{
                      ...CHIP_FLOW,
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                    }}
                  >
                    {sectionTags.map(renderTag)}
                  </View>
                </CollapsibleSection>
              );
            })}
            {editButton}
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
