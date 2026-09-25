import type { Dayjs } from "dayjs";
import _ from "lodash";
import type { ReactNode } from "react";
import React from "react";
import { View } from "react-native";
import { BigCard } from "@/components/BigCard";
import { DATE_FORMAT } from "@/constants/Config";
import { t } from "@/helpers/translation";
import type { LogItem } from "../../../hooks/useLogs";
import { useLogState } from "../../../hooks/useLogs";
import { RATING_KEYS } from "@/constants/Ratings";
import { CardFeedback } from "@/components/Statistics/CardFeedback";
import { NotEnoughDataOverlay } from "@/components/Statistics/NotEnoughDataOverlay";

import { Row } from "./Row";
import { XAxis } from "./XAxis";
import { useAnonymizer } from "../../../hooks/useAnonymizer";

const MIN_ITEMS = 30;

const YearDotsContent = ({
  date,
  items,
}: {
  date: Dayjs;
  items: LogItem[];
}) => {
  const DAY_COUNT = 31;

  const rows: ReactNode[] = [];

  for (let i = 1; i <= DAY_COUNT; i++) {
    rows.push(<Row items={items} date={date} dayCount={i} key={i} />);
  }
  return rows;
};

const YearInPixels = ({ date }: { date: Dayjs }) => {
  const logState = useLogState();
  const { anonymizeItem } = useAnonymizer();

  const items = logState.items.filter((item) =>
    date.isSame(item.dateTime, "year")
  );

  const dummyItems = _.range(0, 365).map(
    (i) =>
      // SAFETY: placeholder items only; Row reads them via optional-chained dateTime, so the missing LogItem fields are never dereferenced.
      ({
        id: `${i}`,
        date: date.add(i, "day").format(DATE_FORMAT),
        rating: _.sample(RATING_KEYS.slice(0, 6)),
        message: "I am feeling",
        createdAt: date.add(i, "day").toISOString(),
      }) as LogItem
  );

  return (
    <BigCard
      title={t("year_in_pixels")}
      subtitle={t("year_in_pixels_description", { date: date.format("YYYY") })}
      isShareable
      hasFeedback
      analyticsId="year-in-pixels"
      analyticsData={items.map((item) => anonymizeItem(item))}
    >
      <>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <XAxis />
        </View>
        {items.length < MIN_ITEMS && (
          <NotEnoughDataOverlay limit={MIN_ITEMS - items.length} />
        )}
        {items.length >= MIN_ITEMS ? (
          <YearDotsContent date={date} items={items} />
        ) : (
          <YearDotsContent date={date} items={dummyItems} />
        )}
      </>
    </BigCard>
  );
};

export default YearInPixels;
