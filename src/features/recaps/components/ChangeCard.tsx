import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { Body, Secondary } from "@/components/Type";
import type { IColors } from "@/constants/Colors";
import type { TAG_COLOR_NAMES } from "@/constants/Config";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { formatDelta } from "../format";
import type {
  ChangeCard as ChangeCardData,
  DateKey,
  Trend,
  TrendSeries,
} from "../types";
import { RecapCardShell } from "./RecapCardShell";
import { RingedAvatar } from "./RingedAvatar";
import { RowTagChip } from "./TitleChip";

/** Plot height, without the month labels below. */
const PLOT_HEIGHT = 120;
/** Room for the month labels. */
const AXIS_HEIGHT = 24;
/** Smallest half range, in mood steps, so flat lines stay flat. */
const MIN_RANGE = 0.5;
const MONTH_TICKS = 4;

/** Line colors for people and places, from the tag palette. */
const PALETTE: (typeof TAG_COLOR_NAMES)[number][] = [
  "violet",
  "teal",
  "orange",
  "pink",
  "sky",
];

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

type Point = [number, number];

/**
 * Smooth path through each run of known values (Catmull-Rom as cubic
 * Bézier). Gaps where data is thin stay gaps.
 */
const toPath = (points: (Point | null)[]) => {
  const runs: Point[][] = [[]];
  for (const point of points) {
    if (point) {
      runs.at(-1)?.push(point);
    } else if ((runs.at(-1)?.length ?? 0) > 0) {
      runs.push([]);
    }
  }
  return runs
    .map((run) =>
      run
        .map(([x, y], index) => {
          if (index === 0) {
            return `M${x.toFixed(1)} ${y.toFixed(1)}`;
          }
          const [x0, y0] = run[index - 2] ?? run[index - 1];
          const [x1, y1] = run[index - 1];
          const [x3, y3] = run[index + 1] ?? [x, y];
          const c1 = [x1 + (x - x0) / 6, y1 + (y - y0) / 6];
          const c2 = [x - (x3 - x1) / 6, y - (y3 - y1) / 6];
          return `C${c1.map((n) => n.toFixed(1)).join(" ")} ${c2.map((n) => n.toFixed(1)).join(" ")} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join("")
    )
    .join("");
};

/** Up to 4 evenly spaced month labels; repeats of a month drop out. */
const monthTicks = (ends: DateKey[]) => {
  const ticks: { index: number; label: string }[] = [];
  for (let step = 0; step < MONTH_TICKS; step += 1) {
    const index = Math.round((step / (MONTH_TICKS - 1)) * (ends.length - 1));
    const label = dayjs(ends[index]).format("MMM");
    if (ticks.at(-1)?.label !== label) {
      ticks.push({ index, label });
    }
  }
  return ticks;
};

interface ChartLine {
  series: TrendSeries;
  color: string;
}

/**
 * Every line on one chart, around a dashed zero line: above is lighter.
 * Gridlines at half and full range, months below, a dot on the latest value.
 */
const TrendChart = ({
  lines,
  ends,
}: {
  lines: ChartLine[];
  ends: DateKey[];
}) => {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const known = lines.flatMap(({ series }) =>
    series.values.flatMap((value) => (value === null ? [] : [Math.abs(value)]))
  );
  const range = Math.max(MIN_RANGE, Math.ceil(Math.max(...known) * 2) / 2);
  const count = Math.max(2, ends.length);
  const x = (index: number) => 4 + (index / (count - 1)) * (width - 8);
  const y = (value: number) =>
    4 + ((range - value) / (2 * range)) * (PLOT_HEIGHT - 8);
  const ticks = monthTicks(ends);

  return (
    <View
      style={{ height: PLOT_HEIGHT + AXIS_HEIGHT }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 && (
        <Svg width={width} height={PLOT_HEIGHT + AXIS_HEIGHT}>
          {[range, range / 2, -range / 2, -range].map((value) => (
            <Line
              key={value}
              x1={0}
              x2={width}
              y1={y(value)}
              y2={y(value)}
              stroke={colors.recapCardBorder}
              strokeWidth={1}
            />
          ))}
          <Line
            x1={0}
            x2={width}
            y1={y(0)}
            y2={y(0)}
            stroke={colors.textSecondary}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          {lines.map(({ series, color }) => {
            const points = series.values.map((value, index): Point | null =>
              value === null ? null : [x(index), y(value)]
            );
            const drawn = points.filter((point) => point !== null);
            const last = drawn.at(-1);
            return (
              <G key={series.id}>
                <Path
                  d={toPath(points)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {last && (
                  <Circle
                    cx={last[0]}
                    cy={last[1]}
                    r={4}
                    fill={color}
                    stroke={colors.cardBackground}
                    strokeWidth={2}
                  />
                )}
              </G>
            );
          })}
          {ticks.map(({ index, label }, position) => {
            const anchors = ["start", "middle", "end"] as const;
            const anchor =
              anchors[
                Math.min(position, 1) + Number(position === ticks.length - 1)
              ];
            return (
              <SvgText
                key={index}
                x={x(index)}
                y={PLOT_HEIGHT + AXIS_HEIGHT - 6}
                fontSize={12}
                fill={colors.textSecondary}
                textAnchor={anchor}
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>
      )}
    </View>
  );
};

/** Color square for legend rows without their own marker. */
const Swatch = ({ color }: { color: string }) => (
  <View
    style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }}
  />
);

interface RowSubject {
  name: string;
  label: ReactNode;
  color: string;
}

/** Name, label, and line color of a trend row, `null` when its subject is gone. */
const getSubject = (
  {
    type,
    series,
    index,
  }: {
    type: ChangeCardData["type"];
    series: TrendSeries;
    index: number;
  },
  { people, tags, colors }: { people: Person[]; tags: Tag[]; colors: IColors }
): RowSubject | null => {
  const color = colors.tags[PALETTE[index % PALETTE.length]].dot;
  if (type === "trend-tags") {
    const tag = tags.find((item) => item.id === series.id);
    return tag
      ? {
          name: tag.title,
          // The tag dot already marks the line color.
          label: <RowTagChip tag={tag} />,
          color: colors.tags[tag.color]?.dot ?? color,
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
              <Swatch color={color} />
              <RingedAvatar person={person} size={24} />
              <Body style={{ flexShrink: 1 }}>{person.name}</Body>
            </View>
          ),
          color,
        }
      : null;
  }
  const name = series.label ?? "";
  return {
    name,
    label: (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Swatch color={color} />
        <Body style={{ flexShrink: 1 }}>{name}</Body>
      </View>
    ),
    color,
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
  const colors = useColors();
  const title = t(TITLES[card.type]);
  const rows = card.series.flatMap((series, index) => {
    const subject = getSubject(
      { type: card.type, series, index },
      { people, tags, colors }
    );
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
          <TrendChart
            lines={rows.map(({ series, subject }) => ({
              series,
              color: subject.color,
            }))}
            ends={card.ends}
          />
          <View style={{ gap: 12 }}>
            {rows.map(({ series, subject }) => {
              const trend = t(TRENDS[series.trend]);
              const now = t("recaps_trend_now", {
                value: formatDelta(series.last),
              });
              return (
                <View
                  key={series.id}
                  accessible
                  accessibilityLabel={`${subject.name}: ${trend}. ${now}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <View style={{ flexShrink: 1 }}>{subject.label}</View>
                  <Secondary style={{ fontVariant: ["tabular-nums"] }}>
                    {`${trend} · ${now}`}
                  </Secondary>
                </View>
              );
            })}
          </View>
        </View>
      }
    />
  );
};
