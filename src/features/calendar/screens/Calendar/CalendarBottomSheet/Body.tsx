import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { RotateCcw } from "react-native-feather";
import LinkButton from "@/components/LinkButton";
import { t } from "@/lib/translation";
import { useCalendarFilters } from "../../../filters";
import { useTagsState } from "@/features/tags";
import { RatingSection } from "./RatingSection";
import { ResultsSection } from "./ResultsSection";
import { SearchInputSection } from "./SearchInputSection";
import { TagsSection } from "./TagsSection";

/**
 * Calendar filter form (text, ratings, tags). Archived tags cannot be
 * selected. Text search is debounced by 200 ms; rating and tag changes
 * apply at once. Filters stay when the sheet closes; Reset clears them.
 * Must render inside `CalendarFiltersProvider`.
 */
export const Body = () => {
  const calendarFilters = useCalendarFilters();
  const { tags } = useTagsState();

  const _tags = tags.filter((tag) => !tag.isArchived);
  const selectedTagIds = new Set(calendarFilters.data.tagIds);

  // Filters outlive the sheet, so reopening shows the kept search text.
  const [searchText, setSearchText] = useState(calendarFilters.data.text);

  const onPressTag = (tag) => {
    calendarFilters.set({
      ...calendarFilters.data,
      tagIds: calendarFilters.data.tagIds.includes(tag.id)
        ? calendarFilters.data.tagIds.filter((id) => id !== tag.id)
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

  // Closing the sheet unmounts the form but keeps the filters, so a pending
  // search applies right away instead of getting lost.
  useEffect(() => () => debouncedTextChangeRef.current?.flush(), []);

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
      {(calendarFilters.data.isFiltering || searchText !== "") && (
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <LinkButton
            type="secondary"
            icon={RotateCcw}
            testID="calendar-filter-reset"
            onPress={() => {
              debouncedTextChangeRef.current?.cancel();
              setSearchText("");
              calendarFilters.reset();
            }}
          >
            {t("reset")}
          </LinkButton>
        </View>
      )}
    </View>
  );
};
