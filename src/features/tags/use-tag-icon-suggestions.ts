import { useEffect, useState } from "react";
import { suggestTagIconsWithModel } from "./apple-intelligence";
import { rankTagIcons } from "./tag-icon-search";
import { tagColorForIcon } from "./tag-icons";
import type { TagIconKey } from "./tag-icons";

/** Wait after the last keystroke before asking for icons. */
export const SUGGESTION_DEBOUNCE_MS = 500;
/** Most icons shown under Suggestions. */
export const MAX_SUGGESTIONS = 12;

/** Suggested icons, best first, and a guessed tag color. */
export interface TagIconSuggestion {
  icons: TagIconKey[];
  color?: string;
}

/**
 * Icons and a color for a tag name: Apple Intelligence on device where
 * available, keyword search otherwise or when the model fails or finds
 * nothing. Without a model color, the color of the best icon's section.
 */
export const suggestTagIcons = async (
  name: string
): Promise<TagIconSuggestion> => {
  const ranked = rankTagIcons(name);
  let fromModel: TagIconSuggestion = { icons: [] };
  try {
    fromModel = await suggestTagIconsWithModel(name);
  } catch {
    // Model unavailable or busy: keyword search below.
  }
  const icons = [...new Set([...fromModel.icons, ...ranked])].slice(
    0,
    MAX_SUGGESTIONS
  );
  const [best] = icons;
  return {
    icons,
    color: fromModel.color ?? (best ? tagColorForIcon(best) : undefined),
  };
};

const NO_SUGGESTIONS: TagIconKey[] = [];

/**
 * Suggested icons for `name`, best first, {@link SUGGESTION_DEBOUNCE_MS}
 * after typing stops. An answer for an older name is dropped. Empty name:
 * no suggestions. `firstColor` is the color of the first answer with one,
 * and stays for later names.
 */
export const useTagIconSuggestions = (name: string) => {
  const trimmed = name.trim();
  const [result, setResult] = useState<{
    name: string;
    suggestions: TagIconKey[];
    firstColor?: string;
  }>({ name: "", suggestions: NO_SUGGESTIONS });
  useEffect(() => {
    if (trimmed === "") {
      return;
    }
    // A newer name cancels this one, so a late answer is dropped.
    let isCancelled = false;
    const timer = setTimeout(async () => {
      const { icons, color } = await suggestTagIcons(trimmed);
      if (!isCancelled) {
        setResult((previous) => ({
          name: trimmed,
          suggestions: icons,
          firstColor: previous.firstColor ?? color,
        }));
      }
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  if (trimmed === "") {
    return {
      suggestions: NO_SUGGESTIONS,
      isSuggesting: false,
      firstColor: result.firstColor,
    };
  }
  return {
    suggestions: result.suggestions,
    isSuggesting: result.name !== trimmed,
    firstColor: result.firstColor,
  };
};
