import { t, tDynamic } from "@/lib/translation";
import { TAG_ICON_COLUMNS } from "./components/tag-icon-grid-row";
import type { TagIconCell } from "./components/tag-icon-grid-row";
import { rankTagIcons } from "./tag-icon-search";
import { TAG_ICON_CATEGORIES, TAG_ICON_KEYS } from "./tag-icons";
import type { TagIconKey } from "./tag-icons";

/** Placeholder cells while suggestions load. */
const SKELETON_COUNT = 5;

/** One list row of the icon picker. */
export type TagIconPickerRow =
  | { type: "header"; key: string; title: string; sectionId: string }
  | { type: "icons"; key: string; cells: TagIconCell[] }
  | { type: "empty"; key: string };

const iconRows = (
  sectionId: string,
  icons: (TagIconKey | null)[]
): TagIconPickerRow[] => {
  const cells = icons.map((icon, index) => ({
    id: icon ?? `${sectionId}-loading-${index}`,
    icon,
  }));
  return Array.from(
    { length: Math.ceil(cells.length / TAG_ICON_COLUMNS) },
    (_, row) => ({
      type: "icons",
      key: `${sectionId}-${row}`,
      cells: cells.slice(row * TAG_ICON_COLUMNS, (row + 1) * TAG_ICON_COLUMNS),
    })
  );
};

/** Icon keys whose keywords match `query`, then keys that contain it. */
export const searchTagIcons = (query: string): TagIconKey[] => {
  const needle = query.trim().toLowerCase();
  const byKey = TAG_ICON_KEYS.filter((key) =>
    key.toLowerCase().includes(needle)
  );
  return [...new Set([...rankTagIcons(query), ...byKey])];
};

/**
 * Rows of the picker list. Search: results only. Else Suggestions for a
 * non-empty name, then every category. Suggestions show placeholders until
 * the first answer arrives.
 */
export const buildTagIconPickerRows = ({
  query,
  title,
  suggestions,
  isSuggesting,
}: {
  query: string;
  title: string;
  suggestions: TagIconKey[];
  isSuggesting: boolean;
}): TagIconPickerRow[] => {
  if (query.trim() !== "") {
    const hits = searchTagIcons(query);
    return [
      {
        type: "header",
        key: "results",
        title: t("tag_icon_results"),
        sectionId: "results",
      },
      ...(hits.length > 0
        ? iconRows("results", hits)
        : [{ type: "empty" as const, key: "empty" }]),
    ];
  }

  const isLoading = isSuggesting && suggestions.length === 0;
  const suggestionRows: TagIconPickerRow[] =
    title.trim() === ""
      ? []
      : [
          {
            type: "header",
            key: "suggestions",
            title: t("tag_icon_suggestions"),
            sectionId: "suggestions",
          },
          ...iconRows(
            "suggestions",
            isLoading
              ? Array.from({ length: SKELETON_COUNT }, () => null)
              : suggestions
          ),
        ];

  return [
    ...suggestionRows,
    ...TAG_ICON_CATEGORIES.flatMap((category): TagIconPickerRow[] => [
      {
        type: "header",
        key: category.id,
        title: tDynamic(`tag_icon_category_${category.id}`),
        sectionId: category.id,
      },
      ...iconRows(category.id, [...category.icons]),
    ]),
  ];
};
