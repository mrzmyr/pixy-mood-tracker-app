import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { EdgeFade } from "@/components/edge-fade";
import { getScrollEdges } from "@/lib/scroll-edges";
import { HeaderButton } from "@/components/header-button";
import { SearchInput } from "@/components/search-input";
import { Copy, Label } from "@/components/typography";
import { SPACE } from "@/constants/space";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { TagColorRow } from "../components/tag-color-row";
import { TagIconButton } from "../components/tag-icon-button";
import { TagIconGridRow } from "../components/tag-icon-grid-row";
import { TagIconTabs } from "../components/tag-icon-tabs";
import { useTagIconPickerSession } from "../tag-icon-picker-session";
import { buildTagIconPickerRows } from "../tag-icon-picker-rows";
import type { TagIconPickerRow } from "../tag-icon-picker-rows";
import type { TagIconCategoryId, TagIconKey } from "../tag-icons";

const HEADER_BOX_SIZE = 36;
const LIST_FADE_SIZE = 32;

/**
 * Icon and color picker of the tag form, in a native sheet: half height,
 * drag up for full height. Header shows the current icon and name. Colors
 * scroll in one row. Suggestions for the name come first, then categories.
 * A pick applies at once and closes the sheet; the form saves it.
 */
export const TagIconPicker = () => {
  const router = useRouter();
  const colors = useColors();
  const haptics = useHaptics();
  const session = useTagIconPickerSession();
  const listRef = useRef<FlashListRef<TagIconPickerRow>>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TagIconCategoryId | null>(null);
  const [edges, setEdges] = useState({ isAtStart: true, isAtEnd: false });

  // The form closed under the sheet: nothing to edit.
  useEffect(() => {
    if (!session) {
      router.back();
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  const title = session.title.trim();
  const rows = buildTagIconPickerRows({
    query,
    title,
    suggestions: session.suggestions,
    isSuggesting: session.isSuggesting,
  });

  const pick = (icon: TagIconKey) => {
    haptics.selection();
    session.onIconPick(icon);
    router.back();
  };

  const jumpTo = (sectionId: TagIconCategoryId) => {
    setActiveTab(sectionId);
    const index = rows.findIndex(
      (row) => row.type === "header" && row.sectionId === sectionId
    );
    if (index !== -1) {
      listRef.current?.scrollToIndex({ index, animated: true });
    }
  };

  const renderRow = ({ item }: { item: TagIconPickerRow }) => {
    if (item.type === "header") {
      return (
        <Label
          size={13}
          strong
          accessibilityRole="header"
          style={{
            color: colors.textSecondary,
            paddingHorizontal: SPACE.xs,
            paddingTop: SPACE.md,
            paddingBottom: SPACE.xs,
          }}
        >
          {item.title}
        </Label>
      );
    }
    if (item.type === "empty") {
      return (
        <Copy
          size={16}
          style={{ color: colors.textSecondary, padding: SPACE.lg }}
        >
          {t("tag_icon_no_results", { query: query.trim() })}
        </Copy>
      );
    }
    return (
      <TagIconGridRow
        cells={item.cells}
        selected={session.icon}
        color={session.color}
        onPick={pick}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.logBackground }}>
      {/* A form sheet expects two views: a header and the scrolling body.
          `collapsable={false}` keeps them, so no row is taken for the list. */}
      <View collapsable={false}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACE.md,
            paddingHorizontal: SPACE.lg,
            paddingTop: SPACE.lg,
            paddingBottom: SPACE.xs,
          }}
        >
          <TagIconButton
            icon={session.icon}
            color={session.color}
            isSuggesting={session.isSuggesting}
            size={HEADER_BOX_SIZE}
          />
          <Label
            size={16}
            strong
            numberOfLines={1}
            accessibilityRole="header"
            style={{ flex: 1, color: colors.text }}
          >
            {title || t("tag_icon_new_tag")}
          </Label>
          <HeaderButton
            kind="cancel"
            label={t("close")}
            testID="tag-icon-close"
            onPress={() => router.back()}
          />
        </View>

        <TagColorRow
          value={session.color}
          onChange={(color) => session.onColorPick(color)}
        />

        <View
          style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm }}
        >
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("tag_icon_search")}
            testID="tag-icon-search"
          />
        </View>
      </View>

      <View collapsable={false} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <FlashList
            ref={listRef}
            data={rows}
            keyExtractor={(row) => row.key}
            getItemType={(row) => row.type}
            renderItem={renderRow}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingHorizontal: SPACE.md,
              paddingBottom: SPACE.lg,
            }}
            scrollEventThrottle={32}
            onScroll={(event) => setEdges(getScrollEdges(event, "y"))}
          />
          <EdgeFade
            edge="top"
            isVisible={!edges.isAtStart}
            color={colors.logBackground}
            transparentColor={colors.logBackgroundTransparent}
            size={LIST_FADE_SIZE}
          />
          <EdgeFade
            edge="bottom"
            isVisible={!edges.isAtEnd}
            color={colors.logBackground}
            transparentColor={colors.logBackgroundTransparent}
            size={LIST_FADE_SIZE}
          />
        </View>

        {query.trim() === "" && (
          <TagIconTabs active={activeTab} onJump={jumpTo} />
        )}
      </View>
    </View>
  );
};
