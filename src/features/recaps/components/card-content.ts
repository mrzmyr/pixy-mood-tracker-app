import type { ReactNode } from "react";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import type { DateKey, Period, RecapDay } from "../types";

/** Parts of a card the shell lays out. */
export interface Content {
  media?: ReactNode;
  title: ReactNode;
  titleLabel: string;
  text?: string;
  body?: ReactNode;
}

/** App data a summary card reads to render. */
export interface Context {
  history: RecapDay[];
  people: Person[];
  tags: Tag[];
  period: Period;
  today: DateKey;
}
