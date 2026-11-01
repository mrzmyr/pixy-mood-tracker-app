import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Card } from "../../components/card";
import { t } from "@/lib/translation";
import { useCalendarFilters } from "@/features/calendar";
import { PersonChip } from "@/features/people";
import useColors from "@/hooks/use-colors";
import type { PeopleDistributionData } from "../../people-distribution";
import { RADIUS } from "@/constants/radius";
import { Label } from "@/components/typography";
import { getBarFraction, getMaxCount } from "../../bar-fraction";

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
  const calendarFilters = useCalendarFilters();
  const router = useRouter();
  const max = getMaxCount(data.people);

  const onPress = (personId: string) => {
    calendarFilters.set({ ...calendarFilters.data, personIds: [personId] });
    router.dismissTo("/calendar");
  };

  return (
    <Card
      subtitle={t("people")}
      title={t("statistics_people_distribution_title")}
    >
      <View style={{ gap: 12, paddingBottom: 12 }}>
        {data.people.slice(0, LIMIT).map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => onPress(entry.id)}
            accessibilityRole="button"
            accessibilityLabel={`${entry.details.name}, ${entry.count}`}
            testID={`statistics-person-${entry.id}`}
            style={({ pressed }) => ({
              gap: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {/* Name row above the bar: the bar spans the full card width, so
                every bar shares one scale whatever the name length. */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <PersonChip
                person={entry.details}
                style={{ flexShrink: 1, minWidth: 0 }}
              />
              <Label
                size={14}
                strong
                style={{
                  color: colors.text,
                  fontVariant: ["tabular-nums"],
                  marginLeft: "auto",
                  paddingLeft: 12,
                }}
              >
                {entry.count}x
              </Label>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: RADIUS.xs,
                backgroundColor: colors.tagBackgroundActive,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${getBarFraction(entry.count, max) * 100}%`,
                  height: 8,
                  borderRadius: RADIUS.xs,
                  backgroundColor: colors.tint,
                }}
              />
            </View>
          </Pressable>
        ))}
      </View>
      {data.people.length > LIMIT && (
        <Label size={14} style={{ marginTop: 8, color: colors.textSecondary }}>
          {t("statistics_people_more", { count: data.people.length - LIMIT })}
        </Label>
      )}
    </Card>
  );
};
