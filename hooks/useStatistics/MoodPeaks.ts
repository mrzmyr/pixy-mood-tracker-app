import { LogItem } from "../useLogs";

export interface MoodPeaksPositiveData {
  items: LogItem[];
}

export interface MoodPeaksNegativeData {
  items: LogItem[];
}

export const defaultMoodPeaksPositiveData = {
  items: [],
};

export const defaultMoodPeaksNegativeData = {
  items: [],
};

export const getMoodPeaksPositiveData = (items: LogItem[]): MoodPeaksPositiveData => {
  const positiveKeys = ["extremely_good", "very_good"];

  const positiveItemsPeaked = items.filter((item) =>
    positiveKeys.includes(item.rating)
  );

  return {
    items: positiveItemsPeaked,
  };
};

export const getMoodPeaksNegativeData = (items: LogItem[]): MoodPeaksNegativeData => {
  const negativeKeys = ["extremely_bad", "very_bad"];

  const negativeItemsPeaked = items.filter((item) =>
    negativeKeys.includes(item.rating)
  );

  return {
    items: negativeItemsPeaked,
  };
};