import { z } from "zod";
import { TAG_COLOR_NAMES } from '@/constants/Config';
import { Tag } from "@/hooks/useTags";
import { LogItem, LogsState, RATING_KEYS } from '@/hooks/useLogs';
import { ExportSettings } from '@/hooks/useSettings';

export interface ImportData {
  version: string;
  items: LogsState["items"] | {
    [key: string]: LogsState["items"][number];
  };
  tags?: Tag[];
  settings: ExportSettings
}

export const pixySchema = z.object({
  version: z.string().optional(),

  items: z.array(z.object({
    id: z.string().optional(),
    date: z.string().refine((date: LogItem['date']) => {
      return /^\d{4}-\d{2}-\d{2}$/.test(date);
    }),
    rating: z.string().refine((rating: LogItem['rating']) => {
      return RATING_KEYS.includes(rating);
    }),
    tags: z.array(z.object({
      id: z.string(),
      name: z.string().optional(),
      color: z.string().refine((color: Tag['color']) => {
        return TAG_COLOR_NAMES.includes(color);
      }).optional()
    }))
  })),

  tags: z.array(z.object({
    id: z.string(),
    title: z.string(),
    color: z.string().refine((color) => {
      return TAG_COLOR_NAMES.includes(color);
    })
  })).optional(),

  settings: z.object({
    actionsDone: z.array(z.object({
      date: z.string().refine((date) => {
        return new Date(date).toString() !== 'Invalid Date';
      }),
      title: z.string()
    })),
    tags: z.array(z.object({
      id: z.string(),
      name: z.string(),
      color: z.string().refine((color) => {
        return TAG_COLOR_NAMES.includes(color);
      })
    })).optional()
  })
}).strict();

const DEBUG = false;

export function getJSONSchemaType(json: any): 'pixy' | 'unknown' {
  const result = pixySchema.safeParse(json);

  if (!result.success && DEBUG) {
    console.log(result.error.issues)
  }

  return result.success ? 'pixy' : 'unknown';
}

