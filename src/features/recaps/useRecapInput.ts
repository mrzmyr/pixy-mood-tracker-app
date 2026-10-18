import dayjs from "dayjs";
import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import { useLocationSetting } from "@/features/location";
import { useLogState } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import { getDays, getPeriodDays } from "./days";
import type { Period, RecapInput } from "./types";

/** Today as a date key, local time. */
export const getToday = () => dayjs().format("YYYY-MM-DD");

/** Everything card and story rules read for `period`, from app state. */
export const useRecapInput = (period: Period): RecapInput => {
  const { items } = useLogState();
  const history = getDays(items);
  const location = useLocationSetting();
  const { tags, categories } = useTagsState();
  const { settings } = useSettings();
  const { people } = usePeopleState();
  const isPeopleOn = useFeatureFlag("people");
  const isPhotosOn = useFeatureFlag("photos");
  const availableSteps = new Set<ConfigurableLoggerStep>(
    ["emotions", "tags", isPeopleOn && "people", isPhotosOn && "photos"].filter(
      (step): step is ConfigurableLoggerStep => step !== false
    )
  );
  return {
    period,
    today: getToday(),
    firstEntryDate: history[0]?.date ?? null,
    days: getPeriodDays(history, period),
    history,
    locationEnabled: location.isAvailable && location.isEnabled,
    steps: new Set(settings.steps),
    availableSteps,
    reminderEnabled: settings.reminderEnabled,
    tags,
    tagCategories: categories,
    personIds: new Set(people.map((person) => person.id)),
  };
};
