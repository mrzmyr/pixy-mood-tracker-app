import type { LucideIcon } from "lucide-react-native";
import CloudDrizzle from "lucide-react-native/icons/cloud-drizzle";
import CloudFog from "lucide-react-native/icons/cloud-fog";
import CloudLightning from "lucide-react-native/icons/cloud-lightning";
import Moon from "lucide-react-native/icons/moon";
import Rainbow from "lucide-react-native/icons/rainbow";
import Snowflake from "lucide-react-native/icons/snowflake";
import Sun from "lucide-react-native/icons/sun";
import ThermometerSun from "lucide-react-native/icons/thermometer-sun";
import Wind from "lucide-react-native/icons/wind";
import colors from "@/constants/Colors/TailwindColors";
import type { TranslationKey } from "@/lib/translation";

/** One tile of the inner weather picker (flag `emotion-weather`). */
export interface Weather {
  id: string;
  name: TranslationKey;
  text: TranslationKey;
  icon: LucideIcon;
  /** Icon color; the tile background is a faint wash of it. */
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
    icon: Sun,
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
    icon: Moon,
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
    icon: Wind,
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
    icon: CloudFog,
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
    icon: CloudDrizzle,
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
    icon: CloudLightning,
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
    icon: ThermometerSun,
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
    icon: Snowflake,
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
    icon: Rainbow,
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
