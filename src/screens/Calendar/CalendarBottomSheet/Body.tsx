import _ from "lodash";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { useCalendarFilters } from "../../../hooks/useCalendarFilters";
import { useTagsState } from "../../../hooks/useTags";
import { Header } from "./Header";
import { RatingSection } from "./RatingSection";
import { ResultsSection } from "./ResultsSection";
import { SearchInputSection } from "./SearchInputSection";
import { TagsSection } from "./TagsSection";

export const Body = () => {
  const calendarFilters = useCalendarFilters();
  const { tags } = useTagsState();

  const _tags = tags.filter((tag) => !tag.isArchived);

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

  const debounceOnTextChange = useCallback(_.debounce(onTextChange, 200), []);

  return (
    <>
      <Header />
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
          selectedTags={_tags.filter((tag) =>
            calendarFilters.data.tagIds.includes(tag.id)
          )}
          onSelect={onPressTag}
        />
        {calendarFilters.data.filteredItems.length !== 0 && (
          <ResultsSection count={calendarFilters.data.filteredItems.length} />
        )}
      </View>
    </>
  );
};
