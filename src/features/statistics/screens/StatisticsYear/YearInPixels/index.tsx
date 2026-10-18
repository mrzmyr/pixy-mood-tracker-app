import type { Dayjs } from "dayjs";
import React from "react";

import { View } from "react-native";
import { BigCard } from "../../../components/BigCard";
import { t } from "@/lib/translation";
import type { LogItem } from "@/features/logs";
import { useToday } from "@/hooks/useToday";
import { NotEnoughDataOverlay } from "../../../components/NotEnoughDataOverlay";

import { Row } from "./Row";
import { XAxis } from "./XAxis";
import { buildYearPixels } from "./yearPixels";

const MIN_ITEMS = 30;

/**
 * Year in Pixels card for the year of `date`. `items` are the entries of
 * that local year. With fewer than {@link MIN_ITEMS} entries the grid stays
 * empty behind the not-enough-data overlay.
 */
const YearInPixels = ({ date, items }: { date: Dayjs; items: LogItem[] }) => {
  const today = useToday();
  const rows = buildYearPixels(
    date.year(),
    items.length >= MIN_ITEMS ? items : []
  );

  return (
    <BigCard
      title={t("year_in_pixels")}
      subtitle={t("year_in_pixels_description", { date: date.format("YYYY") })}
      isShareable
      analyticsId="year-in-pixels"
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
        {rows.map((pixels, index) => (
          <Row
            key={pixels[0].date}
            dayCount={index + 1}
            pixels={pixels}
            today={today}
          />
        ))}
      </>
    </BigCard>
  );
};

export default YearInPixels;
