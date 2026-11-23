import { useRouter } from "expo-router";
import { getCalendarLayoutLabel, useCalendarLayout } from "@/features/calendar";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";

/** Route param of a view switch: the target screen opens without animation. */
const VIEW_SWITCH_PARAMS = { view: "switch" } as const;

/** Route opened from the View menu, see {@link VIEW_SWITCH_PARAMS}. */
export const isViewSwitch = (params?: { view?: string }) =>
  params?.view === VIEW_SWITCH_PARAMS.view;

/** One choice in the View section of the header menu. */
interface ViewMenuItem {
  key: string;
  label: string;
  isOn: boolean;
  handlePress: () => void;
}

/**
 * View choices for the top right header menu, in order: Day (Home, flag
 * `day-view`), then the calendar layouts (Calendar, Timeline with flag
 * `calendar-timeline`). `current` is the screen the menu sits on. Picking a
 * calendar layout from Day switches to Calendar. `isEnabled` is false with
 * one choice only: then there is nothing to switch.
 */
export const useViewMenu = (current: "home" | "calendar") => {
  const router = useRouter();
  const isHomeEnabled = useFeatureFlag("day-view");
  const calendarLayout = useCalendarLayout();

  const day: ViewMenuItem[] = isHomeEnabled
    ? [
        {
          key: "day",
          label: t("view_day"),
          isOn: current === "home",
          handlePress: () => {
            if (current !== "home") {
              router.replace("/home");
            }
          },
        },
      ]
    : [];
  const layouts: ViewMenuItem[] = calendarLayout.availableLayouts.map(
    (layout) => ({
      key: layout,
      label: getCalendarLayoutLabel(layout),
      isOn: current === "calendar" && calendarLayout.layout === layout,
      handlePress: () => {
        calendarLayout.setLayout(layout);
        if (current !== "calendar") {
          router.replace({
            pathname: "/calendar",
            params: VIEW_SWITCH_PARAMS,
          });
        }
      },
    })
  );
  const items = [...day, ...layouts];

  return { isEnabled: items.length > 1, items };
};
