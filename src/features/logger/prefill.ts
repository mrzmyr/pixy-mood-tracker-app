import { z } from "zod";
import { LogItemSchema } from "@/types";

/**
 * Values a new entry starts with, passed to the create route as the JSON
 * route param `prefill`. Voice mode fills it from a transcript.
 */
const LoggerPrefillSchema = z.object({
  message: z.string().default(""),
  tags: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
  emotions: z.array(z.string()).default([]),
  /** Mood the user named in voice mode. */
  rating: LogItemSchema.shape.rating.optional(),
  /** `voice`: values come from voice mode, which asks for feedback after saving. */
  source: z.literal("voice").optional(),
  /** Voice mode listening time, for the feedback event. */
  durationMs: z.number().optional(),
});

/** Start values of a new entry. Ids may be stale until parsed. */
export type LoggerPrefill = z.infer<typeof LoggerPrefillSchema>;

/** Unique ids of `ids` that are also in `allowed`, in input order. */
const keepKnown = (ids: string[], allowed: string[]) => {
  const set = new Set(allowed);
  return [...new Set(ids)].filter((id) => set.has(id));
};

/** Route param value for `prefill`. */
export const encodeLoggerPrefill = (prefill: LoggerPrefill) =>
  JSON.stringify(prefill);

/**
 * Parse the `prefill` route param. Drops ids that are not in `known`, so a
 * stale or hand-made link cannot reference deleted or archived items.
 * Returns `null` for a missing or invalid param.
 */
export const parseLoggerPrefill = (
  param: string | undefined,
  known: { tags: string[]; people: string[]; emotions: string[] }
): LoggerPrefill | null => {
  if (!param) {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(param);
  } catch {
    return null;
  }
  const parsed = LoggerPrefillSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }
  return {
    ...parsed.data,
    message: parsed.data.message,
    tags: keepKnown(parsed.data.tags, known.tags),
    people: keepKnown(parsed.data.people, known.people),
    emotions: keepKnown(parsed.data.emotions, known.emotions),
  };
};
