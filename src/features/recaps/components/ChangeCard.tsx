import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { Body, Secondary } from "@/components/Type";
import type { Person } from "@/features/people";
import { TagComponent } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { formatDelta } from "../format";
import type {
  ChangeCard as ChangeCardData,
  Trend,
  TrendSeries,
} from "../types";
import { RecapCardShell } from "./RecapCardShell";
import { RingedAvatar } from "./RingedAvatar";
import { LABEL_COLUMN, ROW_TAG } from "./rowLayout";

const HEIGHT = 32;
/** Effects beyond this many mood steps draw at the edge. */
const LIMIT = 1.8;

const TITLES: Record<ChangeCardData["type"], TranslationKey> = {
  "trend-tags": "recaps_trend_tags_title",
  "trend-people": "recaps_trend_people_title",
  "trend-location": "recaps_trend_location_title",
};

const TRENDS: Record<Trend, TranslationKey> = {
  steady: "recaps_trend_steady",
  "growing-lift": "recaps_trend_growing_lift",
  "fading-lift": "recaps_trend_fading_lift",
  "weighs-more": "recaps_trend_weighs_more",
  "weighs-less": "recaps_trend_weighs_less",
};

/** SVG path through the values; gaps where data is thin. */
const toPath = (values: (number | null)[], width: number) => {
  let path = "";
  let pen = false;
  for (const [index, value] of values.entries()) {
    if (value === null) {
      pen = false;
    } else {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const clamped = Math.max(-LIMIT, Math.min(LIMIT, value));
      const y = HEIGHT / 2 - (clamped / LIMIT) * (HEIGHT / 2 - 2);
      path += `${pen ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      pen = true;
    }
  }
  return path;
};

/** Line of rolling effects around the zero line: above is lighter. */
const Sparkline = ({ series }: { series: TrendSeries }) => {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  return (
    <View
      style={{ height: HEIGHT }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Line
            x1={0}
            x2={width}
            y1={HEIGHT / 2}
            y2={HEIGHT / 2}
            stroke={colors.textSecondary}
            strokeDasharray="2 3"
          />
          <Path
            d={toPath(series.values, width)}
            fill="none"
            stroke={series.last >= 0 ? colors.moduleMood : colors.textSecondary}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      )}
    </View>
  );
};

interface RowSubject {
  name: string;
  label: ReactNode;
}

/** Name and label of a trend row, `null` when its tag or person is gone. */
const getSubject = (
  type: ChangeCardData["type"],
  series: TrendSeries,
  people: Person[],
  tags: Tag[]
): RowSubject | null => {
  if (type === "trend-tags") {
    const tag = tags.find((item) => item.id === series.id);
    return tag
      ? {
          name: tag.title,
          label: (
            <TagComponent
              title={tag.title}
              colorName={tag.color}
              compact
              style={ROW_TAG}
            />
          ),
        }
      : null;
  }
  if (type === "trend-people") {
    const person = people.find((item) => item.id === series.id);
    return person
      ? {
          name: person.name,
          label: (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <RingedAvatar person={person} size={24} />
              <Body style={{ flexShrink: 1 }}>{person.name}</Body>
            </View>
          ),
        }
      : null;
  }
  const name = series.label ?? "";
  return {
    name,
    label: <Body>{name}</Body>,
  };
};

/** Card for drivers whose effect grew or faded over the period. */
export const ChangeCard = ({
  card,
  people,
  tags,
  footer,
  onLayout,
}: {
  card: ChangeCardData;
  people: Person[];
  tags: Tag[];
  footer: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const title = t(TITLES[card.type]);
  const rows = card.series.flatMap((series) => {
    const subject = getSubject(card.type, series, people, tags);
    return subject ? [{ series, subject }] : [];
  });
  if (rows.length === 0) {
    return null;
  }
  return (
    <RecapCardShell
      type={card.type}
      onLayout={onLayout}
      footer={footer}
      title={title}
      titleLabel={title}
      text={t("recaps_trend_text", { days: card.window })}
      body={
        <View style={{ gap: 16 }}>
          {rows.map(({ series, subject }) => {
            const trend = t(TRENDS[series.trend]);
            const now = t("recaps_trend_now", {
              value: formatDelta(series.last),
            });
            return (
              <View
                key={series.id}
                accessible
                accessibilityLabel={`${subject.name}: ${trend}, ${now}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={LABEL_COLUMN}>{subject.label}</View>
                {/* Trend and value sit under the line on one left edge. */}
                <View style={{ flex: 1, gap: 4 }}>
                  <Sparkline series={series} />
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      columnGap: 8,
                    }}
                  >
                    <Secondary style={{ fontWeight: "700" }}>{trend}</Secondary>
                    <Secondary style={{ fontVariant: ["tabular-nums"] }}>
                      {now}
                    </Secondary>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      }
    />
  );
};
