import { useCalendars } from "expo-localization";
import { getWeekLocale } from "@/lib/translation";
import { getWeekStart } from "@/lib/weekStart";
import { useSetting } from "@/state/settings";

/** Subscribe week grids to saved choices and device calendar changes. */
export const useWeekLocale = (): string => {
  const preference = useSetting("weekStart");
  const [{ firstWeekday }] = useCalendars();
  return getWeekLocale({
    weekStart: getWeekStart({ preference, firstWeekday }),
  });
};
