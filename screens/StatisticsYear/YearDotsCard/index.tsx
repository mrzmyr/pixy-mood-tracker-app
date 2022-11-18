import { Dayjs } from "dayjs";
import React, { ReactNode } from "react";
import { View } from "react-native";
import { BigCard } from "../../../components/BigCard";
import { t } from "../../../helpers/translation";
import { CardFeedback } from "../../Statistics/CardFeedback";

import { Row } from "./Row";
import { XAxis } from "./XAxis";

const YearDotsCard = ({
  date
}: {
  date: Dayjs;
}) => {
  const DAY_COUNT = 31;

  const rows: ReactNode[] = []

  for (let i = 1; i <= DAY_COUNT; i++) {
    rows.push(
      <Row date={date} dayCount={i} key={i} />
    )
  }

  return (
    <BigCard
      title={t('year_in_pixels')}
      subtitle={t('year_in_pixels_description', { date: date.format('YYYY') })}
      isShareable={true}
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
        {rows}
        <CardFeedback
          type='year_dots'
        />
      </>
    </BigCard>
  )
}

export default YearDotsCard