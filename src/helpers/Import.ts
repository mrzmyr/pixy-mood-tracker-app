import { z } from "zod";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import type { Tag } from "@/hooks/useTags";
import type { LogItem, LogsState } from "@/hooks/useLogs";
import { RATING_KEYS } from "@/constants/Ratings";
import type { ExportSettings } from "@/hooks/useSettings";

/**
 * Parsed contents of an export file before {@link migrateImportData}.
 *
 * Older exports store `items` as an id-keyed object and keep tags under
 * `settings.tags`.
 */
export interface ImportData {
  version: string;
  items:
    | LogsState["items"]
    | {
        [key: string]: LogsState["items"][number];
      };
  tags?: Tag[];
  settings: ExportSettings;
}

/**
 * Schema that decides whether an import file is a Pixy export.
 *
 * `z.strictObject` rejects unknown top-level keys: add every new export field
 * here, or the app rejects its own exports.
 */
export const pixySchema = z.strictObject({
  version: z.string().optional(),

  items: z.array(
    z.object({
      id: z.string().optional(),
      date: z
        .string()
        .refine((date: LogItem["date"]) => /^\d{4}-\d{2}-\d{2}$/u.test(date)),
      rating: z
        .string()
        .refine((rating: LogItem["rating"]) => RATING_KEYS.includes(rating)),
      tags: z.array(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          color: z
            .string()
            .refine((color: Tag["color"]) => TAG_COLOR_NAMES.includes(color))
            .optional(),
        })
      ),
    })
  ),

  tags: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        color: z.string().refine((color) => TAG_COLOR_NAMES.includes(color)),
      })
    )
    .optional(),

  settings: z.object({
    actionsDone: z.array(
      z.object({
        date: z
          .string()
          .refine((date) => new Date(date).toString() !== "Invalid Date"),
        title: z.string(),
      })
    ),
    tags: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: z.string().refine((color) => TAG_COLOR_NAMES.includes(color)),
        })
      )
      .optional(),
  }),
});

const DEBUG = false;

/**
 * Classify an import file; anything that fails {@link pixySchema} is
 * `"unknown"` and must not be imported.
 */
export const getJSONSchemaType = (json: ImportData): "pixy" | "unknown" => {
  const result = pixySchema.safeParse(json);

  if (!result.success && DEBUG) {
    console.log(result.error.issues);
  }

  return result.success ? "pixy" : "unknown";
};
