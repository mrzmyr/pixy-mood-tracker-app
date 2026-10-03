import { Text, View } from "react-native";
import { Card } from "../../components/Card";
import { t } from "@/lib/translation";
import { PersonChip } from "@/features/people";
import useColors from "@/hooks/useColors";
import type { PeoplePeaksData } from "../../PeoplePeaks";

const formatDelta = (delta: number) =>
  `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;

/**
 * Highlight card: average mood with each person next to the overall
 * average. Copy stays neutral; a negative delta is a number, never "worse".
 */
export const PeoplePeaksCard = ({ data }: { data: PeoplePeaksData }) => {
  const colors = useColors();

  return (
    <Card
      subtitle={t("people")}
      title={t("statistics_people_peaks_title", {
        avg: (data.overallAvg ?? 0).toFixed(1),
      })}
    >
      <View style={{ flexDirection: "column" }}>
        {data.people.map((entry) => (
          <View
            key={entry.details.id}
            accessible
            accessibilityLabel={t("statistics_people_peaks_row", {
              name: entry.details.name,
              avg: entry.avg.toFixed(1),
              delta: formatDelta(entry.delta),
            })}
            testID={`statistics-people-peak-${entry.details.id}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <PersonChip person={entry.details} style={{ marginBottom: 0 }} />
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
              }}
            >
              {entry.avg.toFixed(1)}{" "}
              <Text style={{ color: colors.textSecondary, fontWeight: "400" }}>
                ({formatDelta(entry.delta)})
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
