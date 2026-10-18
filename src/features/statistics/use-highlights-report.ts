import { useMemo } from "react";
import { useLogState } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { useToday } from "@/hooks/use-today";
import { buildHighlightsReport, getHighlightsNow } from "./highlights-report";
import type { HighlightsReport } from "./highlights-report";

/**
 * Highlights report for today. Rebuilds when entries, tags, or people change,
 * and at local midnight. Must render inside the logs, tags, and people
 * providers.
 */
export const useHighlightsReport = (): HighlightsReport => {
  const { items } = useLogState();
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const today = useToday();

  return useMemo(
    () =>
      buildHighlightsReport({
        items,
        tags,
        people,
        now: getHighlightsNow(today),
      }),
    [items, tags, people, today]
  );
};
