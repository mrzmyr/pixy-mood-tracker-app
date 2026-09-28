import { isISODate } from "@/lib/utils";
import { z } from "zod";

/**
 * Reference from a log entry to a tag by id; tag details live in the tags
 * store.
 */
export const TagReferenceSchema = z.object({
  id: z.uuid(),
});

/** Tag reference stored on a log entry. */
export type TagReference = z.infer<typeof TagReferenceSchema>;

/**
 * Emotion categories ordered worst to best; this is the page order in the
 * advanced emotion picker.
 */
export const EMOTION_CATEGORIES: Emotion["category"][] = [
  "very_bad",
  "bad",
  "neutral",
  "good",
  "very_good",
];

/**
 * Emotion key as stored on log entries; must match a key in the emotion
 * list in `src/features/logger/config.ts`.
 */
export const EmotionKeySchema = z.string();

/** Emotion definition shown in the logger's emotion picker. */
export const EmotionSchema = z.object({
  key: EmotionKeySchema,
  label: z.string(),
  category: z.enum(["very_good", "good", "neutral", "bad", "very_bad"]),
  mode: z.enum(["basic", "advanced"]),
  source: z.enum(["how_we_feel_app", "stoic_app", "custom"]),
  description: z.string(),
  disabled: z.boolean(),
});

/** Emotion definition from the logger's emotion list. */
export type Emotion = z.infer<typeof EmotionSchema>;

/**
 * Shape of a persisted log entry.
 *
 * Used for type inference only; stored data is not parsed with it. `date`
 * is the local calendar day; `dateTime` and `createdAt` are ISO timestamps.
 */
export const LogItemSchema = z.object({
  id: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  dateTime: z.string().refine((value) => isISODate(value)),
  rating: z.enum([
    "extremely_good",
    "very_good",
    "good",
    "neutral",
    "bad",
    "very_bad",
    "extremely_bad",
  ]),
  sleep: z.object({
    quality: z.enum(["very_good", "good", "neutral", "bad", "very_bad"]),
  }),
  message: z.string(),
  createdAt: z.string().refine((value) => isISODate(value)),
  tags: z.array(TagReferenceSchema),
  emotions: z.array(EmotionKeySchema),
});
