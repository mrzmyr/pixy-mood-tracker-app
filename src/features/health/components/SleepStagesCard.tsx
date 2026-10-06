import dayjs from "dayjs";
import { Text, View } from "react-native";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { HealthSleep } from "../sleepFromHealth";
import type { SleepStage, StageSegment } from "../sleepScore";
import { formatSleepMinutes } from "../formatSleepMinutes";

/** Stage colors close to Apple Health, so the chart reads the same. */
const STAGE_COLORS: Record<SleepStage, string> = {
  awake: "#FF7F62",
  rem: "#48C4F5",
  core: "#2F7CF6",
  deep: "#3A2CA8",
  asleep: "#5E5CE6",
  inBed: "#8AD2F8",
};

const STAGE_LABELS: Record<SleepStage, () => string> = {
  awake: () => t("health_stage_awake"),
  rem: () => t("health_stage_rem"),
  core: () => t("health_stage_core"),
  deep: () => t("health_stage_deep"),
  asleep: () => t("health_stage_asleep"),
  inBed: () => t("health_stage_in_bed"),
};

/** Lane order, top to bottom, as in Apple Health. */
const LANE_ORDER: SleepStage[] = [
  "awake",
  "rem",
  "core",
  "deep",
  "asleep",
  "inBed",
];
const LANE_HEIGHT = 14;
/** Keeps short wake-ups visible. */
const MIN_SEGMENT_WIDTH = 2;

/**
 * Last night from Apple Health: total sleep, a timeline with one lane per
 * stage from falling asleep to waking up, and a legend with minutes per
 * stage. Wake-ups show in the awake lane where they happened. Without a
 * watch the night holds only time in bed: one lane, total "in bed".
 */
export const SleepStagesCard = ({ sleep }: { sleep: HealthSleep }) => {
  const colors = useColors();
  const { night } = sleep;
  const isInBed = night.stages.some((part) => part.stage === "inBed");
  const duration = formatSleepMinutes(night.asleepMinutes);
  const total = isInBed
    ? t("health_sleep_total_in_bed", { duration })
    : t("health_sleep_total_asleep", { duration });
  const onset = dayjs(night.onset).format("LT");
  const wake = dayjs(night.wake).format("LT");
  const legend = night.stages.map(
    (part) =>
      `${STAGE_LABELS[part.stage]()} ${formatSleepMinutes(part.minutes)}`
  );
  const span = Math.max(1, night.wake.getTime() - night.onset.getTime());
  const byStage = new Map<SleepStage, StageSegment[]>();
  for (const segment of night.segments) {
    byStage.set(segment.stage, [
      ...(byStage.get(segment.stage) ?? []),
      segment,
    ]);
  }
  const lanes = LANE_ORDER.filter((stage) =>
    night.stages.some((part) => part.stage === stage)
  );

  return (
    <View
      testID="health-sleep-summary"
      accessible
      accessibilityLabel={[total, `${onset} – ${wake}`, ...legend].join(", ")}
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: RADIUS.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
        {total}
      </Text>
      <View style={{ marginTop: 10, gap: 2 }}>
        {lanes.map((stage) => (
          <View key={stage} style={{ height: LANE_HEIGHT }}>
            {(byStage.get(stage) ?? []).map((segment) => (
              <View
                key={segment.start.getTime()}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${((segment.start.getTime() - night.onset.getTime()) / span) * 100}%`,
                  width: `${((segment.end.getTime() - segment.start.getTime()) / span) * 100}%`,
                  minWidth: MIN_SEGMENT_WIDTH,
                  borderRadius: RADIUS.xs,
                  backgroundColor: STAGE_COLORS[stage],
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {onset}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {wake}
        </Text>
      </View>
      <View style={{ flexDirection: "row", marginTop: 10, gap: 4 }}>
        {night.stages.map((part) => (
          <View key={part.stage} style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: RADIUS.full,
                  backgroundColor: STAGE_COLORS[part.stage],
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  fontSize: 12,
                  color: colors.textSecondary,
                }}
              >
                {STAGE_LABELS[part.stage]()}
              </Text>
            </View>
            <Text
              style={{
                marginTop: 1,
                fontSize: 12,
                fontWeight: "600",
                color: colors.text,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatSleepMinutes(part.minutes)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
