import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import type {
  PersonalizationAnswers,
  PersonalizationGoal,
  PersonalizationStruggle,
} from "@/constants/personalization";
import {
  getCatalogCategory,
  getCatalogCategoryTitle,
  getCatalogTagTitle,
} from "@/features/tags";
import type {
  CatalogTag,
  Tag,
  TagCategory,
  TagCategoryData,
  TagCategoryKind,
} from "@/features/tags";

/** Catalog categories each answer brings, most important first. */
const STRUGGLE_CATEGORIES: Record<PersonalizationStruggle, TagCategoryKind[]> =
  {
    stress: ["triggers", "calm", "movement"],
    anxiety: ["triggers", "calm", "food_drink", "screens"],
    low_mood: ["small_wins", "movement", "connection"],
    sleep: ["evening", "food_drink", "screens"],
    focus: ["focus", "screens"],
    loneliness: ["connection"],
    relationships: ["connection"],
    work: ["work", "calm"],
    grief: ["remembering", "connection"],
    body: ["body", "movement"],
    medication: ["medication"],
  };

const GOAL_CATEGORIES: Record<PersonalizationGoal, TagCategoryKind[]> = {
  understand: [],
  what_helps: ["calm", "movement"],
  hard_time: ["small_wins"],
  health: ["body"],
  remember: [],
};

/** Tags onboarding suggests per category; the catalog holds more. */
export const SUGGESTED_TAGS_PER_CATEGORY = 6;

/** One suggested category with the answers that brought it. */
export interface CategorySuggestion {
  kind: TagCategoryKind;
  /** Struggles that led here; empty when only the goal did. */
  reasons: PersonalizationStruggle[];
  tags: CatalogTag[];
}

/**
 * Categories and tags to suggest for the answers. Struggles count before
 * the goal. Main categories of all struggles come before their second
 * ones. Stays within free tag and category slots: later categories get
 * fewer tags or drop out.
 */
export const getSuggestions = ({
  answers,
  tagSlots,
  categorySlots,
}: {
  answers: PersonalizationAnswers;
  tagSlots: number;
  categorySlots: number;
}): CategorySuggestion[] => {
  // Each answer's main category first, then the second ones, and so on:
  // with few free slots, every answer still gets its main category.
  const reasonsByKind = new Map<TagCategoryKind, PersonalizationStruggle[]>();
  const depth = Math.max(
    0,
    ...answers.struggles.map((struggle) => STRUGGLE_CATEGORIES[struggle].length)
  );
  for (let rank = 0; rank < depth; rank += 1) {
    for (const struggle of answers.struggles) {
      const kind = STRUGGLE_CATEGORIES[struggle][rank];
      if (kind) {
        reasonsByKind.set(kind, [...(reasonsByKind.get(kind) ?? [])]);
      }
    }
  }
  for (const struggle of answers.struggles) {
    for (const kind of STRUGGLE_CATEGORIES[struggle]) {
      reasonsByKind.get(kind)?.push(struggle);
    }
  }
  if (answers.goal) {
    for (const kind of GOAL_CATEGORIES[answers.goal]) {
      if (!reasonsByKind.has(kind)) {
        reasonsByKind.set(kind, []);
      }
    }
  }

  const suggestions: CategorySuggestion[] = [];
  let tagsLeft = tagSlots;
  for (const [kind, reasons] of reasonsByKind) {
    const category = getCatalogCategory(kind);
    if (!category || suggestions.length >= categorySlots || tagsLeft <= 0) {
      break;
    }
    const tags = category.tags.slice(
      0,
      Math.min(SUGGESTED_TAGS_PER_CATEGORY, tagsLeft)
    );
    tagsLeft -= tags.length;
    suggestions.push({ kind, reasons, tags });
  }
  return suggestions;
};

/**
 * New tags and categories for the kept suggestions. Removed tags stay out;
 * a category with no tag left stays out too.
 */
export const buildTagSelection = (
  suggestions: CategorySuggestion[],
  removedTagKeys: ReadonlySet<string>
): TagCategoryData => {
  const categories: TagCategory[] = [];
  const tags: Tag[] = [];
  for (const suggestion of suggestions) {
    const kept = suggestion.tags.filter(
      (item) => !removedTagKeys.has(item.key)
    );
    if (kept.length === 0) {
      continue;
    }
    const categoryId = uuidv4();
    const color = getCatalogCategory(suggestion.kind)?.color ?? "slate";
    categories.push({
      id: categoryId,
      title: getCatalogCategoryTitle(suggestion.kind),
      kind: suggestion.kind,
    });
    for (const item of kept) {
      tags.push({
        id: uuidv4(),
        title: getCatalogTagTitle(item),
        color,
        categoryId,
        catalogKey: item.key,
      });
    }
  }
  return { categories, tags };
};

/** Check-in steps the user can switch in onboarding, in screen order. */
export const CAPTURE_OPTIONS = [
  "emotions",
  "sleep",
  "photos",
  "people",
  "message",
] as const satisfies readonly ConfigurableLoggerStep[];

/** Check-in step the capture slide offers. */
export type CaptureOption = (typeof CAPTURE_OPTIONS)[number];

/**
 * Check-in steps after onboarding. Steps the screen does not offer keep
 * their current state; offered ones follow the choice.
 */
export const getStepsForCapture = ({
  current,
  offered,
  chosen,
}: {
  current: ConfigurableLoggerStep[];
  offered: readonly CaptureOption[];
  chosen: ReadonlySet<CaptureOption>;
}): ConfigurableLoggerStep[] => {
  const kept = current.filter(
    (step) => !offered.some((option) => option === step)
  );
  const added = offered.filter((option) => chosen.has(option));
  return [...kept, ...added];
};
