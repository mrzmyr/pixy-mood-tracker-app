import type { ReactElement } from "react";
import type { LogItem } from "@/features/logs";

/** Props shared by the platform `DayMenu` files. */
export interface DayMenuProps {
  /** Local `YYYY-MM-DD` day. */
  date: string;
  /** Entries of `date`, in any order. */
  items: LogItem[];
  /** The calendar day cell. */
  children: ReactElement;
}
