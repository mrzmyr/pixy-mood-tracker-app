import { isISODate } from "@/lib/utils";
import { z } from "zod";

export const TagReferenceSchema = z.object({
  id: z.string().uuid(),
})

export type TagReference = z.infer<typeof TagReferenceSchema>;

export const EMOTION_CATEGORIES: Emotion['category'][] = [
  "very_bad",
  "bad",
  "neutral",
  "good",
  "very_good",
]

export const EmotionKeySchema = z.string()

export const EmotionSchema = z.object({
  key: EmotionKeySchema,
  label: z.string(),
  category: z.enum([
    "very_good",
    "good",
    "neutral",
    "bad",
    "very_bad",
  ]),
  mode: z.enum([
    'basic',
    'advanced',
  ]),
  source: z.enum([
    'how_we_feel_app',
    'stoic_app',
    'custom',
  ]),
  description: z.string(),
  disabled: z.boolean(),
});

export type Emotion = z.infer<typeof EmotionSchema>;

export const LogItemSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTime: z.string().refine((value) => {
    return isISODate(value)
  }),
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
    quality: z.enum([
      "very_good",
      "good",
      "neutral",
      "bad",
      "very_bad",
    ]),
  }),
  message: z.string(),
  createdAt: z.string().refine((value) => {
    return isISODate(value)
  }),
  tags: z.array(TagReferenceSchema),
  emotions: z.array(EmotionKeySchema),
});

