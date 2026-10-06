import dayjs from "dayjs";
import { Text, View } from "react-native";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { HealthSleep } from "../sleepFromHealth";
import type { SleepStage } from "../sleepScore";
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

const BAR_HEIGHT = 12;
/** Keeps short wake-ups visible. */
const MIN_SEGMENT_WIDTH = 2;

/**
 * Last night from Apple Health: total sleep, one bar from falling asleep
 * to waking up with each stage where it happened, and a legend with
 * minutes per stage. Wake-ups show as awake marks in the bar. Without a
 * watch the night holds only time in bed: one color, total "in bed".
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
      <View
        style={{
          height: BAR_HEIGHT,
          marginTop: 10,
          borderRadius: RADIUS.full,
          overflow: "hidden",
          backgroundColor: colors.background,
        }}
      >
        {night.segments.map((segment) => (
          <View
            key={`${segment.stage}-${segment.start.getTime()}`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${((segment.start.getTime() - night.onset.getTime()) / span) * 100}%`,
              width: `${((segment.end.getTime() - segment.start.getTime()) / span) * 100}%`,
              minWidth: MIN_SEGMENT_WIDTH,
              backgroundColor: STAGE_COLORS[segment.stage],
            }}
          />
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
