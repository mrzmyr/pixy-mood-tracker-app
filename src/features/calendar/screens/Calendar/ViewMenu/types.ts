import { t } from "@/lib/translation";
import type { CalendarView } from "../../../views";

/** The menu only reports a choice; the caller owns the route params. */
export interface ViewMenuProps {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
}

/** Menu label per view, read at render so language changes apply. */
export const getViewLabel = (view: CalendarView): string =>
  ({
    year: t("calendar_view_year"),
    month: t("calendar_view_month"),
    week: t("calendar_view_week"),
  })[view];
