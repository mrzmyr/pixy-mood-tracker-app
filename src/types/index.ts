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
 * Reference from a log entry to a person by id; person details live in the
 * people store.
 */
export const PersonReferenceSchema = z.object({
  id: z.uuid(),
});

/** Person reference stored on a log entry. */
export type PersonReference = z.infer<typeof PersonReferenceSchema>;

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

/** Origin of an entry photo. */
export const PhotoSourceKindSchema = z.enum(["day", "library"]);

/** Origin of an entry photo. */
export type PhotoSourceKind = z.infer<typeof PhotoSourceKindSchema>;

/**
 * Photo attached to a log entry. The image file lives on the device only.
 *
 * `fileName` is relative to the photos directory (`<id>.jpg`). Never store an
 * absolute path: the iOS app container path changes between installs and
 * updates.
 */
export const LogPhotoSchema = z.object({
  id: z.uuid(),
  fileName: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.string().refine((value) => isISODate(value)),
  /**
   * Where the photo came from: `day` (photos of the entry's day) or
   * `library` (system picker). Feeds analytics counts only.
   */
  source: PhotoSourceKindSchema,
  /**
   * Library asset id (iOS local identifier), when known: `day` photos, and
   * library picks on iOS. Device-local, not content. Keeps the library
   * photo out of the photos step suggestions, so it is not offered twice.
   */
  libraryId: z.string().optional(),
});

/** Photo reference stored on a log entry. */
export type LogPhoto = z.infer<typeof LogPhotoSchema>;

/**
 * Place attached to a log entry. Stays on the device; never sent to
 * analytics. `name` is the reverse geocoded place, `null` when the lookup
 * failed (for example offline).
 */
export const LogLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().nullable(),
});

/** Place stored on a log entry. */
export type LogLocation = z.infer<typeof LogLocationSchema>;

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
  people: z.array(PersonReferenceSchema),
  emotions: z.array(EmotionKeySchema),
  photos: z.array(LogPhotoSchema),
  /** Missing on entries logged without location. */
  location: LogLocationSchema.optional(),
});

/** Partial value with required identifying keys. */
export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;
