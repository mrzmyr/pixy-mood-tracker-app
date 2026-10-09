import { z } from "zod";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import type { Tag, TagCategory } from "@/features/tags";
import type { LogItem, LogsState } from "@/features/logs";
import type { Person } from "@/features/people";
import { RATING_KEYS } from "@/constants/Ratings";
import type { ExportSettings } from "@/state/settings";

/**
 * Person in an export file. The avatar travels inline as base64 JPEG so the
 * file stays self contained; `null` means no photo.
 */
export type ExportPerson = Omit<Person, "avatar"> & {
  avatar: { base64: string; mime: "image/jpeg" } | null;
};

/**
 * Parsed contents of an export file before {@link migrateImportData}.
 *
 * Older exports store `items` as an id-keyed object and keep tags under
 * `settings.tags`. Exports from before the people feature have no `people`.
 */
export interface ImportData {
  version: string;
  items:
    | LogsState["items"]
    | {
        [key: string]: LogsState["items"][number];
      };
  tags?: Tag[];
  tagCategories?: TagCategory[];
  people?: ExportPerson[];
  settings: ExportSettings;
}

/**
 * Schema that decides whether an import file is a Pixy export.
 *
 * `z.strictObject` rejects unknown top-level keys: add every new export field
 * here, or the app rejects its own exports.
 *
 * `photos` holds metadata only. Export files never contain photo files, so
 * imported references can point to files missing on this device.
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
      people: z.array(z.object({ id: z.string() })).optional(),
      photos: z
        .array(
          z.object({
            id: z.string(),
            fileName: z.string(),
            width: z.number(),
            height: z.number(),
            createdAt: z.string(),
            source: z.enum(["day", "library"]),
            libraryId: z.string().optional(),
          })
        )
        .optional(),
    })
  ),

  people: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        avatar: z
          .object({ base64: z.string(), mime: z.literal("image/jpeg") })
          .nullable(),
      })
    )
    .optional(),

  tags: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        color: z.string().refine((color) => TAG_COLOR_NAMES.includes(color)),
        categoryId: z.string().optional(),
      })
    )
    .optional(),

  tagCategories: z
    .array(z.object({ id: z.string(), title: z.string() }))
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

/**
 * Classify an import file; anything that fails {@link pixySchema} is
 * `"unknown"` and must not be imported.
 */
export const getJSONSchemaType = (json: ImportData): "pixy" | "unknown" => {
  const result = pixySchema.safeParse(json);

  return result.success ? "pixy" : "unknown";
};
