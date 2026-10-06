import { Text, View } from "react-native";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { HealthSleep } from "../sleepFromHealth";
import type { SleepStage } from "../sleepScore";
import { AppleHealthIcon } from "./AppleHealthIcon";
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

/**
 * Last night from Apple Health: total sleep, a stacked bar of the sleep
 * stages, and a legend with minutes per stage. Without a watch the night
 * holds only time in bed: one bar, total "in bed".
 */
export const SleepStagesCard = ({ sleep }: { sleep: HealthSleep }) => {
  const colors = useColors();
  const { night } = sleep;
  const isInBed = night.stages.some((part) => part.stage === "inBed");
  const duration = formatSleepMinutes(night.asleepMinutes);
  const total = isInBed
    ? t("health_sleep_total_in_bed", { duration })
    : t("health_sleep_total_asleep", { duration });
  const legend = night.stages.map(
    (part) =>
      `${STAGE_LABELS[part.stage]()} ${formatSleepMinutes(part.minutes)}`
  );

  return (
    <View
      testID="health-sleep-summary"
      accessible
      accessibilityLabel={[t("health_section"), total, ...legend].join(", ")}
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: RADIUS.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <AppleHealthIcon size={16} />
        <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>
          {t("health_section")}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
          {total}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          height: 10,
          marginTop: 10,
          gap: 2,
          borderRadius: RADIUS.full,
          overflow: "hidden",
        }}
      >
        {night.stages.map((part) => (
          <View
            key={part.stage}
            style={{
              flex: part.minutes,
              backgroundColor: STAGE_COLORS[part.stage],
            }}
          />
        ))}
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
