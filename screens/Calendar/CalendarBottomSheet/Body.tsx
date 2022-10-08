import { View } from 'react-native';
import { useCalendarFilters } from '../../../hooks/useCalendarFilters';
import { useSettings } from '../../../hooks/useSettings';
import { Header } from './Header';
import { RatingSection } from './RatingSection';
import { ResultsSection } from './ResultsSection';
import { SearchInputSection } from './SearchInputSection';
import { TagsSection } from './TagsSection';

export const Body = () => {
  const calendarFilters = useCalendarFilters();
  const { settings } = useSettings();

  const onPressTag = (tag) => {
    calendarFilters.set({
      ...calendarFilters.data,
      tagIds: calendarFilters.data.tagIds.includes(tag.id) ?
        calendarFilters.data.tagIds.filter(t => t !== tag.id) :
        [...calendarFilters.data.tagIds, tag.id]
    });
  };

  const onPressRating = (rating) => {
    calendarFilters.set({
      ...calendarFilters.data,
      ratings: calendarFilters.data.ratings.includes(rating) ?
        calendarFilters.data.ratings.filter(r => r !== rating) :
        [...calendarFilters.data.ratings, rating]
    });
  };

  return (
    <>
      <Header />
      <View
        style={{
          padding: 16,
        }}
      >
        <SearchInputSection
          value={calendarFilters.data.text}
          onChange={(text) => {
            calendarFilters.set({
              ...calendarFilters.data,
              text,
            });
          }} />
        <RatingSection
          value={calendarFilters.data.ratings}
          onChange={onPressRating} />
        <TagsSection
          tags={settings.tags}
          selectedTags={settings.tags.filter(tag => calendarFilters.data.tagIds.includes(tag.id))}
          onSelect={onPressTag} />
        {calendarFilters.filteredItems.length !== 0 && (
          <ResultsSection
            count={calendarFilters.filteredItems.length} />
        )}
      </View>
    </>
  );
};
