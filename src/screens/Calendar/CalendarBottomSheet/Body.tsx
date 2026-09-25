import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useCalendarFilters } from "../../../hooks/useCalendarFilters";
import { useTagsState } from "../../../hooks/useTags";
import { Header } from "./Header";
import { RatingSection } from "./RatingSection";
import { ResultsSection } from "./ResultsSection";
import { SearchInputSection } from "./SearchInputSection";
import { TagsSection } from "./TagsSection";

/**
 * Calendar filter form (text, ratings, tags). Archived tags cannot be
 * selected. Text search is debounced by 200 ms; rating and tag changes
 * apply at once. Must render inside `CalendarFiltersProvider`.
 */
export const Body = ({ onClose }: { onClose?: () => void }) => {
  const calendarFilters = useCalendarFilters();
  const { tags } = useTagsState();

  const _tags = tags.filter((tag) => !tag.isArchived);
  const selectedTagIds = new Set(calendarFilters.data.tagIds);

  const [searchText, setSearchText] = useState("");

  const onPressTag = (tag) => {
    calendarFilters.set({
      ...calendarFilters.data,
      tagIds: calendarFilters.data.tagIds.includes(tag.id)
        ? calendarFilters.data.tagIds.filter((t) => t !== tag.id)
        : [...calendarFilters.data.tagIds, tag.id],
    });
  };

  const onPressRating = (rating) => {
    calendarFilters.set({
      ...calendarFilters.data,
      ratings: calendarFilters.data.ratings.includes(rating)
        ? calendarFilters.data.ratings.filter((r) => r !== rating)
        : [...calendarFilters.data.ratings, rating],
    });
  };

  const onTextChange = (text) => {
    calendarFilters.set({
      ...calendarFilters.data,
      text,
    });
  };

  // The debounced function is created once, so it calls the latest
  // `onTextChange` through a ref instead of the first render's closure.
  const onTextChangeRef = useRef(onTextChange);
  useEffect(() => {
    onTextChangeRef.current = onTextChange;
  });

  const debouncedTextChangeRef = useRef<DebouncedFunc<
    (text: string) => void
  > | null>(null);

  const debounceOnTextChange = (text: string) => {
    if (debouncedTextChangeRef.current === null) {
      debouncedTextChangeRef.current = debounce(
        (nextText: string) => onTextChangeRef.current(nextText),
        200
      );
    }
    debouncedTextChangeRef.current(text);
  };

  return (
    <>
      <Header onClose={onClose} />
      <View
        style={{
          padding: 16,
        }}
      >
        <SearchInputSection
          value={searchText}
          onChange={(text) => {
            setSearchText(text);
            debounceOnTextChange(text);
          }}
        />
        <RatingSection
          value={calendarFilters.data.ratings}
          onChange={onPressRating}
        />
        <TagsSection
          tags={_tags}
          selectedTags={_tags.filter((tag) => selectedTagIds.has(tag.id))}
          onSelect={onPressTag}
        />
        {calendarFilters.data.filteredItems.length !== 0 && (
          <ResultsSection count={calendarFilters.data.filteredItems.length} />
        )}
      </View>
    </>
  );
};
