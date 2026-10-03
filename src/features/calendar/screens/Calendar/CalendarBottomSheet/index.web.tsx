/**
 * Web build of the calendar filter sheet. `@expo/ui` has no web module, and
 * importing it throws at load, which blanks the whole web app. The calendar
 * already skips the sheet on web, so this renders nothing.
 */
export const CalendarBottomSheet = () => null;
