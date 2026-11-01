import { View } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/use-colors";
import { RADIUS } from "@/constants/radius";
import { formatTrend } from "@/lib/format-number";
import { Heading, Label } from "@/components/typography";

/**
 * Summary tile. The trend row renders whenever `trendValue` is not 0,
 * including when it is undefined; pass `trendValue={0}` to hide it.
 */
export const StatsCard = ({
  title,
  subtitle,
  style,
  trendType,
  trendValue,
}: {
  title: string;
  subtitle: string;
  style?: ViewStyle;
  trendType?: "up" | "down";
  trendValue?: number;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        padding: 16,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: "row",
        }}
      >
        <View
          style={{
            width: "100%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              marginBottom: 4,
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Heading
              size={20}
              style={{
                color: colors.text,
                fontWeight: "bold",
                fontVariant: ["tabular-nums"],
                marginRight: 4,
              }}
            >
              {title}
            </Heading>
            {trendValue !== 0 && (
              <Label
                size={14}
                style={{
                  fontVariant: ["tabular-nums"],
                  color:
                    trendType === "up"
                      ? colors.palette.green[500]
                      : colors.palette.red[500],
                }}
              >
                {formatTrend(trendValue ?? 0, trendType ?? "down")}
              </Label>
            )}
          </View>
          <Label
            size={14}
            style={{
              color: colors.textSecondary,
              fontWeight: "bold",
            }}
          >
            {subtitle}
          </Label>
        </View>
      </View>
    </View>
  );
};
