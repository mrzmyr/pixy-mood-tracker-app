import { Platform, TurboModuleRegistry } from "react-native";
import type { TurboModule } from "react-native";
import { z } from "zod";
import { TAG_COLOR_NAMES } from "@/constants/config";
import { isTagIconKey, TAG_ICON_KEYS } from "./tag-icons";
import type { TagIconKey } from "./tag-icons";

/** Part of the `@react-native-ai/apple` native module this app calls. */
interface AppleLLM extends TurboModule {
  isAvailable: () => boolean;
  generateText: (
    messages: { role: "system" | "user"; content: string }[],
    options: { temperature?: number; schema?: object }
  ) => Promise<{ type: string; text?: string }[]>;
}

/** How many icons the model returns, best first. */
const SUGGESTION_COUNT = 6;

const INSTRUCTIONS = [
  "You pick icons for tags in a mood journal.",
  "A tag names an activity, place, person, or feeling of the user's day.",
  `Return the ${SUGGESTION_COUNT} icon names that fit the tag best, best first,`,
  "and the color that fits the tag best.",
].join(" ");

/** Output schema: icon keys and a tag color name, so the model can only return known values. */
const SCHEMA = {
  type: "object",
  properties: {
    icons: {
      type: "array",
      minItems: 1,
      maxItems: SUGGESTION_COUNT,
      items: { type: "string", enum: TAG_ICON_KEYS },
    },
    color: { type: "string", enum: TAG_COLOR_NAMES },
  },
  required: ["icons", "color"],
};

const ModelOutput = z.object({
  icons: z.array(z.string()),
  color: z.string().optional(),
});

/** What the model suggests for a tag name. */
export interface ModelSuggestion {
  icons: TagIconKey[];
  /** Tag color name, when the model returned a known one. */
  color?: string;
}

/** Model text as {@link ModelOutput}, or a failed parse for text that is not JSON. */
const parseModelOutput = (text: string) => {
  try {
    return ModelOutput.safeParse(JSON.parse(text));
  } catch {
    return ModelOutput.safeParse(null);
  }
};

/**
 * Known icon keys in model output, in order, without repeats. Reads the
 * schema JSON, and falls back to every known word: the native module turns
 * structured output into text, and its format is not documented.
 */
export const parseModelSuggestion = (text: string): ModelSuggestion => {
  const output = parseModelOutput(text);
  const words = output.success
    ? output.data.icons
    : (text.match(/[A-Za-z]+/gu) ?? []);
  const colorWords = output.success ? [output.data.color ?? ""] : words;
  return {
    icons: [...new Set(words.filter(isTagIconKey))],
    color: colorWords.find((word) => TAG_COLOR_NAMES.includes(word)),
  };
};

/**
 * Apple Foundation Models (Apple Intelligence), or `null` where it is
 * missing: Android, web, Jest, dev clients built before it, iOS before 26,
 * and devices without Apple Intelligence turned on.
 */
const getModel = (): AppleLLM | null => {
  if (Platform.OS !== "ios") {
    return null;
  }
  const model = TurboModuleRegistry.get<AppleLLM>("NativeAppleLLM");
  try {
    return model?.isAvailable() ? model : null;
  } catch {
    return null;
  }
};

/**
 * Icon keys, best first, and a color for a tag name from the on-device
 * model. Runs on device: the tag name never leaves the phone. Empty without
 * the model. Rejects when the model fails; the caller falls back to keyword
 * search.
 */
export const suggestTagIconsWithModel = async (
  tagName: string
): Promise<ModelSuggestion> => {
  const model = getModel();
  if (!model) {
    return { icons: [] };
  }

  const parts = await model.generateText(
    [
      { role: "system", content: INSTRUCTIONS },
      { role: "user", content: `Tag: ${tagName}` },
    ],
    { temperature: 0, schema: SCHEMA }
  );
  const text = parts.find((part) => part.type === "text")?.text ?? "";
  return parseModelSuggestion(text);
};
