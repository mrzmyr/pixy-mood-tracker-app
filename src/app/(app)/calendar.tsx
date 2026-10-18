import { CalendarScreen } from "@/features/calendar/routes";
import { CalendarHeaderButtons } from "@/shell/CalendarHeaderButtons";

/** Buttons render here, not in the layout: `Stack.Toolbar` targets the current route. */
const CalendarRoute = () => (
  <>
    <CalendarHeaderButtons />
    <CalendarScreen />
  </>
);

export default CalendarRoute;
