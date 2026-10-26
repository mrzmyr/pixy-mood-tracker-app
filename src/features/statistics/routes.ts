// Route screens. Import only from src/app route files and other screens, never from startup code.
import { StatisticsHighlights as Highlights } from "./screens/statistics/highlights";
import { StatisticsMonthScreen as Month } from "./screens/statistics-month";
import { StatisticsScreen as Statistics } from "./screens/statistics";
import { StatisticsYearScreen as Year } from "./screens/statistics-year";
import { withRecapsRedirect } from "./screens/recaps-redirect";

/** All highlights. Flag `recaps` on: this week's Recaps. */
export const StatisticsHighlights = withRecapsRedirect(Highlights, "week");
/** Month report. Flag `recaps` on: the month Recap of `date`. */
export const StatisticsMonthScreen = withRecapsRedirect(Month, "month");
/** Statistics tab. Flag `recaps` on: this week's Recaps. */
export const StatisticsScreen = withRecapsRedirect(Statistics, "week");
/** Year report. Flag `recaps` on: the year Recap of `date`. */
export const StatisticsYearScreen = withRecapsRedirect(Year, "year");
export { TagDistributionContent } from "./screens/statistics/tags-distribution-card";
