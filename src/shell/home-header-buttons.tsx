import { Stack } from "expo-router";
import { Platform } from "react-native";
import { ProfileHeaderButton } from "@/features/profile";
import { t } from "@/lib/translation";
import { useViewMenu } from "./view-menu";

// Android renders only image icons in the header; iOS uses SF Symbols.
const VIEW_ICON =
  Platform.OS === "ios"
    ? "line.3.horizontal.decrease"
    : require("../../assets/images/icons/filter.png");

/**
 * Home header buttons (flag `day-view`), top right like on Calendar: the
 * View menu (Day, Calendar, Timeline) on the filter icon, then Settings.
 * Must render inside the home page: `Stack.Toolbar` sets options of the
 * current route.
 */
export const HomeHeaderButtons = () => {
  const viewMenu = useViewMenu("home");

  return (
    <Stack.Toolbar placement="right">
      {viewMenu.isEnabled && (
        <Stack.Toolbar.Menu
          icon={VIEW_ICON}
          accessibilityLabel={t("calendar_view")}
          separateBackground
        >
          <Stack.Toolbar.Menu inline title={t("calendar_view")}>
            {viewMenu.items.map((item) => (
              <Stack.Toolbar.MenuAction
                key={item.key}
                isOn={item.isOn}
                onPress={item.handlePress}
              >
                {item.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      )}
      <Stack.Toolbar.View>
        <ProfileHeaderButton />
      </Stack.Toolbar.View>
    </Stack.Toolbar>
  );
};
