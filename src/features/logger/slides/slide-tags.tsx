import { useSlideMarginTop } from "./margin-top";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import {
  arrangeShownTags,
  getTagMenuActions,
  groupTagsByCategory,
  useTagMenu,
  useTagsState,
  useTagsUpdater,
  TagComponent as Tag,
} from "@/features/tags";
import type { Tag as ITag, TagCategory } from "@/features/tags";
import { useLogDraft } from "../log-draft";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/link-button";
import { Label } from "@/components/typography";
import { Chip } from "@/components/chip";
import Plus from "lucide-react-native/icons/plus";
import { CHIP, CHIP_GAP } from "@/constants/chip";
import { useAnalytics } from "@/state/analytics";
import { SlideHeadline } from "../components/slide-headline";
import { PullToSearch } from "../components/pull-to-search";
import { TagChipFlow } from "../components/tag-chip-flow";
import { moveId } from "../components/tile-reorder";
import { matchesSearch } from "@/lib/search";
import { Footer } from "./footer";
import { useFeatureFlag } from "@/state/feature-flags";
import noop from "lodash/noop";

/**
 * Tag picker slide. Archived tags are hidden unless the draft already has
 * them. Pulling the list down reveals a search by tag title. Tags are grouped
 * by category; headings show only when more than one category has tags, so a
 * single category looks like a plain tag list.
 *
 * Chips reorder by drag inside their category and have a menu: Edit,
 * Archive, Delete. iOS: hold shows the system context menu, moving the
 * finger drags. Elsewhere: hold lifts the chip, release in place opens the
 * editor. Archive and Delete also take the tag off the draft.
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
  const hasTagIcons = useFeatureFlag("tag-icons");
  const analytics = useAnalytics();
  const { arrangeTags } = useTagsUpdater();
  const runMenuAction = useTagMenu();

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

  const marginTop = useSlideMarginTop();

  const reorder = (
    categoryId: TagCategory["id"],
    orderedIds: ITag["id"][],
    method: "drag" | "accessibility_action"
  ) => {
    analytics.track("tags:tags_arranged", {
      tags_count: orderedIds.length,
      categories_count: categories.length,
      category_changed: false,
      method,
    });
    arrangeTags([arrangeShownTags(tags, categoryId, orderedIds)]);
  };

  const deselect = (id: ITag["id"]) =>
    setTags(draft.tags.filter((selectedTag) => selectedTag.id !== id));

  const editTag = (id: ITag["id"]) =>
    router.push({ pathname: "/tags/[id]", params: { id } });

  const renderTag = (
    {
      categoryId,
      sectionTags,
    }: { categoryId: TagCategory["id"]; sectionTags: ITag[] },
    tag: ITag,
    isPressBlocked: () => boolean
  ) => {
    const sectionIds = sectionTags.map((item) => item.id);
    const move = (offset: -1 | 1) => {
      const neighborId = sectionIds[sectionIds.indexOf(tag.id) + offset];
      if (neighborId) {
        reorder(
          categoryId,
          moveId(sectionIds, tag.id, neighborId),
          "accessibility_action"
        );
      }
    };
    return (
      <Tag
        onPress={() => {
          if (isPressBlocked()) {
            return;
          }
          setTags(
            selectedTagIds.has(tag.id)
              ? draft.tags.filter((selectedTag) => selectedTag.id !== tag.id)
              : [...draft.tags, tag]
          );
        }}
        // Hold opens the menu or lifts the chip; screen readers keep "edit".
        accessibilityActions={[
          { name: "edit", label: t("edit") },
          { name: "moveUp", label: t("tags_move_up") },
          { name: "moveDown", label: t("tags_move_down") },
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === "edit") {
            editTag(tag.id);
          }
          if (nativeEvent.actionName === "moveUp") {
            move(-1);
          }
          if (nativeEvent.actionName === "moveDown") {
            move(1);
          }
        }}
        title={tag.title}
        colorName={tag.color}
        icon={tag.icon}
        showIcon={hasTagIcons}
        selected={selectedTagIds.has(tag.id)}
        testID={`log-tag-${tag.id}`}
      />
    );
  };

  const editButton = (
    <Chip
      isToggle={false}
      label={t("tags_edit")}
      lead={<Plus size={CHIP.lead} color={colors.chipText} />}
      onPress={() => {
        router.push("/tags");
      }}
    />
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
              gap: showHeadings ? 12 : 0,
              paddingBottom: showHeadings ? 12 : 0,
            }}
          >
            {sections.map(({ category, tags: sectionTags }, index) => (
              <View
                key={category.id}
                testID={`log-tags-category-${category.id}`}
                style={{ gap: 8 }}
              >
                {showHeadings && (
                  <Label
                    size={14}
                    strong
                    accessibilityRole="header"
                    style={{ color: colors.textSecondary }}
                  >
                    {category.title}
                  </Label>
                )}
                <TagChipFlow
                  tags={sectionTags}
                  renderTag={(tag, isPressBlocked) =>
                    renderTag(
                      { categoryId: category.id, sectionTags },
                      tag,
                      isPressBlocked
                    )
                  }
                  trailing={index === sections.length - 1 ? editButton : null}
                  onReorder={(orderedIds) =>
                    reorder(category.id, orderedIds, "drag")
                  }
                  menuActions={getTagMenuActions}
                  onMenuAction={(tag, actionId) =>
                    runMenuAction(tag, actionId, {
                      onEdit: () => editTag(tag.id),
                      onArchived: () => deselect(tag.id),
                      onDeleted: () => deselect(tag.id),
                    })
                  }
                />
              </View>
            ))}
            {sections.length === 0 && (
              <View style={{ paddingRight: CHIP_GAP, paddingBottom: CHIP_GAP }}>
                {editButton}
              </View>
            )}
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
