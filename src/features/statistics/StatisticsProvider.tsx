import isEqual from "lodash/isEqual";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useLogState } from "@/features/logs";
import { useTagsState } from "@/features/tags";
import { usePeopleState } from "@/features/people";
import { createMissingProviderError } from "@/lib/errors";
import { buildHighlightsReport } from "./highlightsReport";
import type { HighlightsReport } from "./highlightsReport";

const DELAY_LOADING = 1 * 1000;

interface Value {
  /** `null` until the first {@link Value.refresh}. */
  report: HighlightsReport | null;
  isLoading: boolean;
  /**
   * Rebuild the report for the current time. Skips the loading state when
   * the report is unchanged, unless `force` is set.
   */
  refresh: (options?: { force?: boolean }) => void;
}

// SAFETY: every consumer renders inside StatisticsProvider, which supplies the full Value.
const StatisticsContext = createContext({} as Value);

/**
 * Caches the highlights report for the statistics tab.
 *
 * Nothing is computed until a consumer calls `refresh`. Must render inside
 * the logs, tags, and people providers.
 */
export const StatisticsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { items } = useLogState();
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<HighlightsReport | null>(null);

  const refresh = useCallback(
    ({ force = false }: { force?: boolean } = {}) => {
      const next = buildHighlightsReport({
        items,
        tags,
        people,
        now: new Date(),
      });

      if (!force && isEqual(report, next)) {
        return;
      }

      setReport(next);

      if (!next.unlocked) {
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, DELAY_LOADING);
    },
    [items, tags, people, report]
  );

  const value: Value = useMemo(
    () => ({ report, isLoading, refresh }),
    [report, isLoading, refresh]
  );

  return (
    <StatisticsContext.Provider value={value}>
      {children}
    </StatisticsContext.Provider>
  );
};

/**
 * Highlights report and refresh. Must render inside {@link StatisticsProvider}.
 */
export const useStatistics = (): Value => {
  const context = useContext(StatisticsContext);
  if (context === undefined) {
    throw createMissingProviderError("useStatistics", "StatisticsProvider");
  }
  return context;
};
