import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { t } from "@/lib/translation";
import { useCalendarFilters } from "@/features/calendar";
import { PersonChip } from "@/features/people";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { PeopleDistributionData } from "../../PeopleDistribution";
import { RADIUS } from "@/constants/Radius";

const LIMIT = 5;

/**
 * Highlight card: entries per person, most seen first. Tapping a row filters
 * the calendar to that person and switches to the Calendar tab.
 */
export const PeopleDistributionCard = ({
  data,
}: {
  data: PeopleDistributionData;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const calendarFilters = useCalendarFilters();
  const router = useRouter();
  const max = data.people[0]?.count ?? 1;

  const onPress = (personId: string) => {
    haptics.selection();
    calendarFilters.set({ ...calendarFilters.data, personIds: [personId] });
    router.dismissTo("/calendar");
  };

  return (
    <Card
      subtitle={t("people")}
      title={t("statistics_people_distribution_title")}
    >
      <View style={{ flexDirection: "column" }}>
        {data.people.slice(0, LIMIT).map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => onPress(entry.id)}
            accessibilityRole="button"
            accessibilityLabel={`${entry.details.name}, ${entry.count}`}
            testID={`statistics-person-${entry.id}`}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <PersonChip person={entry.details} style={{ marginBottom: 0 }} />
            <View
              style={{
                flex: 1,
                height: 8,
                borderRadius: RADIUS.xs,
                backgroundColor: colors.tagBackgroundActive,
                marginRight: 12,
              }}
            >
              <View
                style={{
                  width: `${(entry.count / max) * 100}%`,
                  height: 8,
                  borderRadius: RADIUS.xs,
                  backgroundColor: colors.tint,
                }}
              />
            </View>
            <Text
              style={{
                color: colors.text,
                fontSize: 14,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
                minWidth: 32,
                textAlign: "right",
              }}
            >
              {entry.count}x
            </Text>
          </Pressable>
        ))}
        {data.people.length > LIMIT && (
          <Text
            style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary }}
          >
            {t("statistics_people_more", { count: data.people.length - LIMIT })}
          </Text>
        )}
      </View>
    </Card>
  );
};
