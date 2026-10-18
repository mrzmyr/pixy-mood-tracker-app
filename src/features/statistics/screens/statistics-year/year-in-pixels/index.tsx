import type { Dayjs } from "dayjs";
import React from "react";

import { View } from "react-native";
import { BigCard } from "../../../components/big-card";
import { t } from "@/lib/translation";
import type { LogItem } from "@/features/logs";
import { useToday } from "@/hooks/use-today";
import { NotEnoughDataOverlay } from "../../../components/not-enough-data-overlay";

import { Row } from "./row";
import { XAxis } from "./x-axis";
import { buildYearPixels } from "./year-pixels";

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
