import { CalendarScreen } from "@/features/calendar";
import { CalendarHeaderMenu } from "@/shell/CalendarHeaderMenu";

/** Menu renders here, not in the layout: `Stack.Toolbar` targets the current route. */
const CalendarRoute = () => (
  <>
    <CalendarHeaderMenu />
    <CalendarScreen />
  </>
);

export default CalendarRoute;
