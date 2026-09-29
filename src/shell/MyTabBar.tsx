import { Pressable, Text, View } from "react-native";
import {
  Calendar as CalendarIcon,
  PieChart,
  Settings as SettingsIcon,
} from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";

interface TabRoute {
  name: string;
  icon: (props: SvgProps) => React.JSX.Element;
}

const ROUTES: TabRoute[] = [
  {
    name: "statistics",
    icon: PieChart,
  },
  {
    name: "calendar",
    icon: CalendarIcon,
  },
  {
    name: "settings",
    icon: SettingsIcon,
  },
];

/**
 * Custom tab bar for Router tabs. Tab icons are looked up by route
 * name, so a new tab needs an entry in `ROUTES`.
 */
export const MyTabBar = ({ state, descriptors, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  return (
    <View
      style={{
        flexDirection: "row",
        marginBottom: insets.bottom,
        borderTopColor: colors.tabsBorder,
        borderTopWidth: 1,
        backgroundColor: colors.tabsBackground,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // The `merge: true` option makes sure that the params inside the tab screen are preserved
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        const Icon = ROUTES.find((r) => r.name === route.name)?.icon;

        const accessibilityState = {
          selected: isFocused,
        };

        const _onPress = async () => {
          await haptics.selection();
          onPress?.();
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={accessibilityState}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={_onPress}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: isFocused
                  ? colors.tabsTextActive
                  : "transparent",
                width: "50%",
                height: 2,
                marginTop: -1,
                marginBottom: 4,
              }}
            />
            {Icon !== undefined && (
              <Icon
                width={20}
                color={
                  isFocused ? colors.tabsIconActive : colors.tabsIconInactive
                }
              />
            )}
            <Text
              style={{
                color: isFocused
                  ? colors.tabsTextActive
                  : colors.tabsTextInactive,
                fontSize: 12,
                fontWeight: "700",
                marginTop: 2,
                marginBottom: 4,
              }}
            >
              {t(label.toLowerCase())}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
