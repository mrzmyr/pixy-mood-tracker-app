import { View } from "react-native";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { RADIUS } from "@/constants/radius";
import { Copy, Label } from "@/components/typography";

const getSubtitleKey = (limit: number | undefined) => {
  if (!limit) {
    return "statistics_not_enough_data_subtitle_without_count";
  }
  return limit === 1
    ? "statistics_not_enough_data_subtitle_singular"
    : "statistics_not_enough_data_subtitle_plural";
};

/**
 * Overlay that hides placeholder statistics until enough data exists.
 *
 * Absolutely positioned with negative offsets that match `BigCard` padding,
 * so render it as a direct child of a card. `limit` is the number of
 * entries still missing.
 */
export const NotEnoughDataOverlay = ({
  limit,
  showSubtitle = true,
}: {
  limit?: number;
  showSubtitle?: boolean;
}) => {
  const colors = useColors();

  const subtitleKey = getSubtitleKey(limit);

  return (
    <View
      style={{
        position: "absolute",
        top: -16,
        left: -20,
        right: -20,
        bottom: -16,
        backgroundColor: colors.statisticsNotEnoughDataBackdrop,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        zIndex: 999,
      }}
    >
      <Label
        size={16}
        style={{
          color: colors.statisticsNotEnoughDataTitle,
          fontWeight: "bold",
          textAlign: "center",
          paddingHorizontal: 20,
          lineHeight: 20,
          marginBottom: 2,
        }}
      >
        {t("statistics_not_enough_data_title")}
      </Label>
      {showSubtitle && (
        <Copy
          size={14}
          style={{
            color: colors.statisticsNotEnoughDataSubtitle,
            textAlign: "center",
            paddingHorizontal: 20,
            lineHeight: 20,
          }}
        >
          {t(subtitleKey, { count: limit })}
        </Copy>
      )}
    </View>
  );
};
