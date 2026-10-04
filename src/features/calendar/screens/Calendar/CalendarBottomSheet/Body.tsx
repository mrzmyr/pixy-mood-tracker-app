import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { RotateCcw } from "react-native-feather";
import Button from "@/components/Button";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useCalendarFilters } from "../../../filters";
import { useTagsState } from "@/features/tags";
import { usePeopleState } from "@/features/people";
import type { Person } from "@/features/people";
import { useFeatureFlag } from "@/state/featureFlags";
import { PeopleSection } from "./PeopleSection";
import { RatingSection } from "./RatingSection";
import { ResultsSection } from "./ResultsSection";
import { SearchInputSection } from "./SearchInputSection";
import { TagsSection } from "./TagsSection";

/**
 * Calendar filter form (text, ratings, tags, people). Archived tags and
 * people cannot be selected; people show only behind the `people` flag. Text search is debounced by 200 ms; rating and tag changes
 * apply at once. Filters stay when the sheet closes; Reset clears them.
 * Must render inside `CalendarFiltersProvider`.
 */
export const Body = () => {
  const colors = useColors();
  const calendarFilters = useCalendarFilters();
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const hasPeople = useFeatureFlag("people");

  const _tags = tags.filter((tag) => !tag.isArchived);
  const selectedTagIds = new Set(calendarFilters.data.tagIds);
  const _people = people.filter((person) => !person.isArchived);
  const selectedPersonIds = new Set(calendarFilters.data.personIds);

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

  const onPressPerson = (person: Person) => {
    calendarFilters.set({
      ...calendarFilters.data,
      personIds: selectedPersonIds.has(person.id)
        ? calendarFilters.data.personIds.filter((id) => id !== person.id)
        : [...calendarFilters.data.personIds, person.id],
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
      {hasPeople && _people.length > 0 && (
        <PeopleSection
          people={_people}
          selectedIds={selectedPersonIds}
          onSelect={onPressPerson}
        />
      )}
      {/* Reset shares the result row: the half-height Android sheet cuts off
          anything below it. */}
      {(calendarFilters.data.isFiltering || searchText !== "") && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
          }}
        >
          {calendarFilters.data.filteredItems.length !== 0 && (
            <ResultsSection count={calendarFilters.data.filteredItems.length} />
          )}
          <Button
            type="secondary"
            size="small"
            icon={
              <RotateCcw
                width={16}
                height={16}
                color={colors.secondaryButtonText}
              />
            }
            testID="calendar-filter-reset"
            onPress={() => {
              debouncedTextChangeRef.current?.cancel();
              setSearchText("");
              calendarFilters.reset();
            }}
          >
            {t("reset")}
          </Button>
        </View>
      )}
    </View>
  );
};
