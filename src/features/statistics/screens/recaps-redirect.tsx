import dayjs from "dayjs";
import { Redirect, useLocalSearchParams } from "expo-router";
import type { ComponentType } from "react";
import { DATE_FORMAT } from "@/constants/config";
import { useFeatureFlag } from "@/state/feature-flags";

type RecapKind = "week" | "month" | "year";

/**
 * Statistics screen that hands over to Recaps with flag `recaps` on: Recaps
 * carries every statistics card then. Deep links keep their `date` param.
 */
export const withRecapsRedirect = (Screen: ComponentType, kind: RecapKind) => {
  const RedirectingScreen = () => {
    const isRecapsOn = useFeatureFlag("recaps");
    const { date } = useLocalSearchParams<{ date?: string }>();
    if (!isRecapsOn) {
      return <Screen />;
    }
    const day = date && dayjs(date).isValid() ? dayjs(date) : dayjs();
    return (
      <Redirect
        href={{
          pathname: "/recaps/[kind]/[date]",
          params: { kind, date: day.format(DATE_FORMAT) },
        }}
      />
    );
  };
  return RedirectingScreen;
};
