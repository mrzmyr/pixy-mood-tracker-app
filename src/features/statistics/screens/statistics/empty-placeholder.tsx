import { View } from "react-native";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { Subtitle } from "./subtitle";
import { Title } from "./title";
import { RADIUS } from "@/constants/radius";
import { Copy } from "@/components/typography";

/**
 * Locked highlights placeholder; `count` is the number of entries still
 * needed to unlock statistics.
 */
export const EmptyPlaceholder = ({ count }: { count: number }) => {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <Title>{t("statistics_highlights")}</Title>
      <Subtitle>{t("statistics_highlights_description")}</Subtitle>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.statisticsNoDataBorder,
          borderStyle: "dashed",
          padding: 16,
          borderRadius: RADIUS.md,
          borderCurve: "continuous",
          minHeight: 120,
          marginTop: 16,
        }}
      >
        <Copy
          size={16}
          style={{
            color: colors.statisticsNoDataText,
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          {t("statistics_no_data", { count })}
        </Copy>
      </View>
    </View>
  );
};
