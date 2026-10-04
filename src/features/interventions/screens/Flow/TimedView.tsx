import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { InterventionId, TimedStep } from "../../catalog";

const SIZE = 200;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const formatTime = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

/** Body part with a countdown ring. The flow moves on at zero. */
export const TimedView = ({
  id,
  step,
  index,
  count,
  remainingMs,
}: {
  id: InterventionId;
  step: TimedStep;
  index: number;
  count: number;
  remainingMs: number;
}) => {
  const colors = useColors();
  const left = remainingMs / (step.sec * 1000);

  return (
    <View style={{ alignItems: "center", gap: 24 }}>
      <View style={{ width: SIZE, height: SIZE, justifyContent: "center" }}>
        <Svg
          width={SIZE}
          height={SIZE}
          style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
        >
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.stepperBackground}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.tint}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - left)}
            fill="none"
          />
        </Svg>
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 34,
              fontWeight: "600",
              color: colors.text,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatTime(remainingMs)}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            {t("interventions_part_progress", {
              current: index + 1,
              total: count,
            })}
          </Text>
        </View>
      </View>
      <View style={{ gap: 8, paddingHorizontal: 8 }}>
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 24,
            fontWeight: "600",
            color: colors.text,
            textAlign: "center",
          }}
        >
          {t(`interventions_${id}_${step.key}_part`)}
        </Text>
        <Text
          style={{
            fontSize: 17,
            lineHeight: 25,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {t(`interventions_${id}_${step.key}_text`)}
        </Text>
      </View>
    </View>
  );
};
