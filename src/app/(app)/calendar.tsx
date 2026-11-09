import { CalendarScreen } from "@/features/calendar/routes";
import { OpenHomeOnce } from "@/features/home";
import { CalendarHeaderButtons } from "@/shell/calendar-header-buttons";

/** Buttons render here, not in the layout: `Stack.Toolbar` targets the current route. */
const CalendarRoute = () => (
  <>
    <CalendarHeaderButtons />
    <CalendarScreen />
    <OpenHomeOnce />
  </>
);

export default CalendarRoute;
