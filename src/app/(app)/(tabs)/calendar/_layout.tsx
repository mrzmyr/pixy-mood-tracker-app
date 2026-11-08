import { Stack } from "expo-router";
import { HAS_FLOATING_HEADER } from "@/constants/floating-header";
import { CalendarScreenReaderTitle } from "@/features/calendar";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";

/**
 * Calendar tab. Title stays the iOS back button label; the header shows
 * none but exposes the screen name to screen readers.
 */
const CalendarLayout = () => {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t("calendar"),
          headerTitle: CalendarScreenReaderTitle,
          headerTintColor: colors.text,
          headerShadowVisible: false,
          ...(HAS_FLOATING_HEADER
            ? {
                headerTransparent: true,
                scrollEdgeEffects: { top: "soft" as const },
              }
            : { headerStyle: { backgroundColor: colors.calendarBackground } }),
        }}
      />
    </Stack>
  );
};

export default CalendarLayout;
