import { CalendarScreen } from "@/features/calendar/routes";
import { CalendarHomeSwitch } from "@/features/home";
import { CalendarHeaderButtons } from "@/shell/calendar-header-buttons";

/** Buttons render here, not in the layout: `Stack.Toolbar` targets the current route. */
const CalendarRoute = () => (
  <>
    <CalendarHeaderButtons />
    <CalendarScreen />
    <CalendarHomeSwitch />
  </>
);

export default CalendarRoute;
