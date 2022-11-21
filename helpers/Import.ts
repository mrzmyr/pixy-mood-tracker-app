import { TAG_COLOR_NAMES } from '../constants/Config';
import { Tag } from "../hooks/useTags";
import { LogItem, LogsState, RATING_KEYS } from './../hooks/useLogs';
import { ExportSettings } from './../hooks/useSettings';
import { z } from "zod";
import dayjs from 'dayjs';
import { v4 as uuidv4 } from "uuid";

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
    date: z.string().refine((date) => {
      return new Date(date).toString() !== 'Invalid Date';
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

const DEBUG = true;

export function getJSONSchemaType(json: any): 'pixy' | 'unknown' {
  const result = pixySchema.safeParse(json);

  if (!result.success && DEBUG) {
    console.log(result.error.issues)
  }

  return result.success ? 'pixy' : 'unknown';
}

export function convertPixeltoPixyJSON(data): LogsState {
  const pixy: {
    items: LogsState["items"];
  } = {
    items: []
  }

  data.forEach(item => {
    const rating = {
      5: 'extremely_good',
      4: 'very_good',
      3: 'neutral',
      2: 'very_bad',
      1: 'extremely_bad',
    }[item.mood]

    pixy.items.push({
      id: uuidv4(),
      date: item.date,
      dateTime: dayjs(item.date).toISOString(),
      createdAt: dayjs(item.date).toISOString(),
      rating,
      message: item.notes,
      tags: []
    })
  })

  return pixy
}
