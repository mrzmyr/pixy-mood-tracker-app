import { getLogDays } from "@/lib/utils";
import { LogDay, LogItem } from "../useLogs";

export interface MoodPeaksPositiveData {
  days: LogDay[];
}

export interface MoodPeaksNegativeData {
  days: LogDay[];
}

export const defaultMoodPeaksPositiveData = {
  days: [],
};

export const defaultMoodPeaksNegativeData = {
  days: [],
};

export const getMoodPeaksPositiveData = (items: LogItem[]): MoodPeaksPositiveData => {
  const positiveKeys = ["extremely_good", "very_good", "good"];

  const logDays = getLogDays(items);
  const positiveDaysPeaked = logDays.filter((item) => positiveKeys.includes(item.ratingAvg));

  return {
    days: positiveDaysPeaked,
  };
};

export const getMoodPeaksNegativeData = (items: LogItem[]): MoodPeaksNegativeData => {
  const negativeKeys = ["extremely_bad", "very_bad", "bad"];

  const logDays = getLogDays(items);
  const negativeItemsPeaked = logDays.filter((item) => negativeKeys.includes(item.ratingAvg));

  return {
    days: negativeItemsPeaked,
  };
};