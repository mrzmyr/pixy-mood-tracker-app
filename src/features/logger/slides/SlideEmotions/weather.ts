import colors from "@/constants/Colors/TailwindColors";
import type { TranslationKey } from "@/lib/translation";

/** Weather tile ids; each has its own art in `WeatherArt`. */
export type WeatherId =
  | "sunny"
  | "clear"
  | "breezy"
  | "foggy"
  | "drizzle"
  | "storm"
  | "heatwave"
  | "frost"
  | "rainbow";

/** One tile of the inner weather picker (flag `emotion-weather`). */
export interface Weather {
  id: WeatherId;
  name: TranslationKey;
  text: TranslationKey;
  /** Tile background, top to bottom. */
  gradient: readonly [string, string];
  /** Dark tile: the name is white. */
  isDark?: boolean;
  /** Tint of the emotion card under the tiles. */
  hue: string;
  /** Emotion keys that feel like this weather, best fit first. */
  emotions: string[];
}

/**
 * Weather tiles in grid order: bright and calm first, heavy last, repair at
 * the end. Every emotion key must be enabled in `config.ts`.
 */
export const WEATHER: Weather[] = [
  {
    id: "sunny",
    name: "log_emotions_weather_sunny",
    text: "log_emotions_weather_sunny_text",
    gradient: ["#fde68a", "#fbbf24"],
    hue: colors.amber[500],
    emotions: [
      "happy",
      "excited",
      "enthusiastic",
      "energized",
      "proud",
      "inspired",
      "motivated",
      "impassioned",
    ],
  },
  {
    id: "clear",
    name: "log_emotions_weather_clear",
    text: "log_emotions_weather_clear_text",
    gradient: ["#bae6fd", "#ccfbf1"],
    hue: colors.sky[500],
    emotions: [
      "calm",
      "content",
      "balanced",
      "comfortable",
      "satisfied",
      "good",
      "relieved",
    ],
  },
  {
    id: "breezy",
    name: "log_emotions_weather_breezy",
    text: "log_emotions_weather_breezy_text",
    gradient: ["#e0f2fe", "#a7f3d0"],
    hue: colors.teal[500],
    emotions: [
      "hopeful",
      "optimistic",
      "focused",
      "productive",
      "brave",
      "surprised",
      "desire",
    ],
  },
  {
    id: "foggy",
    name: "log_emotions_weather_foggy",
    text: "log_emotions_weather_foggy_text",
    gradient: ["#e5e7eb", "#d1d5db"],
    hue: colors.slate[500],
    emotions: [
      "confused",
      "distracted",
      "meh",
      "bored",
      "unmotivated",
      "uneasy",
      "worried",
      "concerned",
      "awkward",
    ],
  },
  {
    id: "drizzle",
    name: "log_emotions_weather_drizzle",
    text: "log_emotions_weather_drizzle_text",
    gradient: ["#cbd5e1", "#94a3b8"],
    hue: colors.blue[500],
    emotions: [
      "sad",
      "disappointed",
      "lonely",
      "pessimistic",
      "fragile",
      "vulnerable",
      "alienated",
      "rejected",
    ],
  },
  {
    id: "storm",
    name: "log_emotions_weather_storm",
    text: "log_emotions_weather_storm_text",
    gradient: ["#334155", "#1e293b"],
    isDark: true,
    hue: colors.violet[500],
    emotions: [
      "angry",
      "frustrated",
      "overwhelmed",
      "stressed",
      "annoyed",
      "irritated",
      "impatient",
      "fearful",
    ],
  },
  {
    id: "heatwave",
    name: "log_emotions_weather_heatwave",
    text: "log_emotions_weather_heatwave_text",
    gradient: ["#fb923c", "#f43f5e"],
    isDark: true,
    hue: colors.orange[500],
    emotions: [
      "hyper",
      "restless",
      "nervous",
      "anxious",
      "fomo",
      "pressured",
      "embarrassed",
      "insecure",
    ],
  },
  {
    id: "frost",
    name: "log_emotions_weather_frost",
    text: "log_emotions_weather_frost_text",
    gradient: ["#e0e7ff", "#c7d2fe"],
    hue: colors.cyan[500],
    emotions: [
      "tired",
      "exhausted",
      "weak",
      "hopeless",
      "depressed",
      "grieved",
      "ashamed",
      "guilty",
    ],
  },
  {
    id: "rainbow",
    name: "log_emotions_weather_rainbow",
    text: "log_emotions_weather_rainbow_text",
    gradient: ["#e0f2fe", "#fef3c7"],
    hue: colors.pink[500],
    emotions: [
      "grateful",
      "thankful",
      "loved",
      "supported",
      "heard",
      "accepted",
      "appreciated",
      "connected",
      "compassionate",
    ],
  },
];

/** Most tiles picked at once; picking one more drops the oldest. */
export const MAX_WEATHER = 2;

/** Picks or unpicks a tile. A pick past {@link MAX_WEATHER} drops the oldest. */
export const toggleWeather = (picked: string[], id: string) => {
  if (picked.includes(id)) {
    return picked.filter((p) => p !== id);
  }
  return [...picked, id].slice(-MAX_WEATHER);
};
