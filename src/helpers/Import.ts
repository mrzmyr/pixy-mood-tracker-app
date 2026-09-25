import { z } from "zod";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import type { Tag } from "@/hooks/useTags";
import type { LogItem, LogsState } from "@/hooks/useLogs";
import { RATING_KEYS } from "@/constants/Ratings";
import type { ExportSettings } from "@/hooks/useSettings";

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

export const pixySchema = z
  .object({
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
            color: z
              .string()
              .refine((color) => TAG_COLOR_NAMES.includes(color)),
          })
        )
        .optional(),
    }),
  })
  .strict();

const DEBUG = false;

export const getJSONSchemaType = (json: ImportData): "pixy" | "unknown" => {
  const result = pixySchema.safeParse(json);

  if (!result.success && DEBUG) {
    console.log(result.error.issues);
  }

  return result.success ? "pixy" : "unknown";
};
