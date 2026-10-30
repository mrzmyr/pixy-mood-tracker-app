import type { LucideIcon } from "lucide-react-native";
import Compass from "lucide-react-native/icons/compass";
import Handshake from "lucide-react-native/icons/handshake";
import Moon from "lucide-react-native/icons/moon";
import Shield from "lucide-react-native/icons/shield";
import Sparkles from "lucide-react-native/icons/sparkles";
import Wrench from "lucide-react-native/icons/wrench";
import type { TranslationKey } from "@/lib/translation";
import type { Emotion } from "@/types";

/** How well one Need was met, in segment order. */
export const NEED_STATES = ["met", "partly", "unmet"] as const;

/** How well one Need was met. */
export type NeedState = (typeof NEED_STATES)[number];

/**
 * One basic need of the needs check. Self-Determination Theory core
 * (autonomy, competence, connection) plus body, safety, and joy from
 * Glasser, Grawe, and Maslow.
 *
 * `met` and `unmet` list emotion keys, strongest match first.
 */
interface Need {
  key: string;
  label: TranslationKey;
  icon: LucideIcon;
  met: string[];
  unmet: string[];
}

/** Needs in display order. Every emotion key must exist in `EMOTIONS`. */
export const NEEDS = [
  {
    key: "body",
    label: "log_needs_body",
    icon: Moon,
    met: ["energized", "balanced", "comfortable", "good"],
    unmet: ["tired", "exhausted", "weak", "restless", "irritated"],
  },
  {
    key: "safety",
    label: "log_needs_safety",
    icon: Shield,
    met: ["calm", "relieved", "comfortable", "balanced"],
    unmet: ["anxious", "worried", "nervous", "uneasy", "fearful"],
  },
  {
    key: "connection",
    label: "log_needs_connection",
    icon: Handshake,
    met: ["connected", "loved", "supported", "accepted", "heard"],
    unmet: ["lonely", "alienated", "rejected", "sad", "vulnerable"],
  },
  {
    key: "autonomy",
    label: "log_needs_autonomy",
    icon: Compass,
    met: ["motivated", "brave", "content", "relieved"],
    unmet: ["pressured", "frustrated", "angry", "stressed", "impatient"],
  },
  {
    key: "competence",
    label: "log_needs_competence",
    icon: Wrench,
    met: ["proud", "productive", "focused", "satisfied"],
    unmet: ["overwhelmed", "insecure", "disappointed", "frustrated"],
  },
  {
    key: "joy",
    label: "log_needs_joy",
    icon: Sparkles,
    met: ["happy", "excited", "enthusiastic", "good", "content"],
    unmet: ["bored", "meh", "unmotivated", "fomo", "sad"],
  },
] as const satisfies readonly Need[];

/** Key of one {@link NEEDS} entry. */
export type NeedKey = (typeof NEEDS)[number]["key"];

/** Rated needs. Unrated needs have no key. */
export type NeedStates = Partial<Record<NeedKey, NeedState>>;

const MAX_SUGGESTIONS = 10;
const PER_NEED = 3;

/**
 * Emotions that match the rated needs, at most 10, without duplicates.
 *
 * Unmet needs come first: they are the strongest signal. Then met needs,
 * then partly met needs with one pleasant and two unpleasant emotions.
 * Disabled emotions are skipped.
 */
export const suggestEmotionsForNeeds = (
  states: NeedStates,
  emotions: Emotion[]
): Emotion[] => {
  const byKey = new Map<string, Emotion>();
  for (const emotion of emotions) {
    if (emotion.disabled !== true) {
      byKey.set(emotion.key, emotion);
    }
  }
  const keys: string[] = [];
  const add = (list: readonly string[], count: number) => {
    keys.push(...list.filter((key) => byKey.has(key)).slice(0, count));
  };

  for (const need of NEEDS) {
    if (states[need.key] === "unmet") {
      add(need.unmet, PER_NEED);
    }
  }
  for (const need of NEEDS) {
    if (states[need.key] === "met") {
      add(need.met, PER_NEED);
    }
  }
  for (const need of NEEDS) {
    if (states[need.key] === "partly") {
      add(need.met, 1);
      add(need.unmet, 2);
    }
  }

  return [...new Set(keys)]
    .slice(0, MAX_SUGGESTIONS)
    .flatMap((key) => byKey.get(key) ?? []);
};
