import { Stack } from "expo-router";
import { HAS_FLOATING_HEADER } from "@/constants/floating-header";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";

/** Home tab: native bar without title, the profile button on the right. */
const HomeLayout = () => {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t("today"),
          headerTitle: "",
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

export default HomeLayout;
