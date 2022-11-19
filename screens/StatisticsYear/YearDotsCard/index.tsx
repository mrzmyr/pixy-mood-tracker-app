import { Dayjs } from "dayjs";
import _ from "lodash";
import React, { ReactNode } from "react";
import { View } from "react-native";
import { BigCard } from "../../../components/BigCard";
import { DATE_FORMAT } from "../../../constants/Config";
import { t } from "../../../helpers/translation";
import { LogItem, RATING_KEYS, useLogState } from "../../../hooks/useLogs";
import { CardFeedback } from "../../Statistics/CardFeedback";
import { NotEnoughDataOverlay } from "../../StatisticsMonth/NotEnoughDataOverlay";

import { Row } from "./Row";
import { XAxis } from "./XAxis";

const YearDotsContent = ({
  date,
  items,
}: {
  date: Dayjs;
  items: LogItem[];
}) => {
  const DAY_COUNT = 31;

  const rows: ReactNode[] = []

  for (let i = 1; i <= DAY_COUNT; i++) {
    rows.push(
      <Row items={items} date={date} dayCount={i} key={i} />
    )
  }
  return (
    <>
      {rows}
    </>
  )
}

const YearDotsCard = ({
  date
}: {
  date: Dayjs;
}) => {
  const logState = useLogState();

  const items = Object.values(logState.items).filter(item => {
    return date.isSame(item.date, 'year')
  })

  const dummyItems = _.range(0, 365).map((i) => ({
    id: `${i}`,
    date: date.add(i, 'day').format(DATE_FORMAT),
    rating: _.sample(RATING_KEYS.slice(0, 6)) as LogItem['rating'],
    message: 'I am feeling',
    createdAt: date.add(i, 'day').toISOString(),
  }));

  return (
    <BigCard
      title={t('year_in_pixels')}
      subtitle={t('year_in_pixels_description', { date: date.format('YYYY') })}
      isShareable={true}
      analyticsId="year-in-pixels"
    >
      <>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <XAxis />
        </View>
        {items.length < 1 && (
          <NotEnoughDataOverlay />
        )}
        {items.length > 5 ? (
          <YearDotsContent
            date={date}
            items={items}
          />
        ) : (
          <YearDotsContent
            date={date}
            items={dummyItems}
          />
        )}
        <CardFeedback
          type='year_dots'
        />
      </>
    </BigCard>
  )
}

export default YearDotsCard