import * as Sentry from "@sentry/react-native";
import {
  getAppIconName,
  setAlternateAppIcon,
  supportsAlternateIcons,
} from "expo-alternate-app-icons";
import { Circle, CircleCheck, Lock } from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import MenuList from "@/components/MenuList";
import TextInfo from "@/components/TextInfo";
import { APP_ICONS } from "@/constants/AppIcons";
import type { AppIcon, AppIconId } from "@/constants/AppIcons";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import Alert from "@/lib/Alert";
import { createStructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";

const PREVIEW_SIZE = 56;

const LABELS: Record<
  AppIconId,
  { title: TranslationKey; description: TranslationKey }
> = {
  default: {
    title: "app_icon_default",
    description: "app_icon_default_description",
  },
  sunburst: {
    title: "app_icon_sunburst",
    description: "app_icon_sunburst_description",
  },
  "sunburst-inverse": {
    title: "app_icon_sunburst_inverse",
    description: "app_icon_sunburst_inverse_description",
  },
  "sunburst-black": {
    title: "app_icon_sunburst_black",
    description: "app_icon_sunburst_black_description",
  },
  "sunburst-black-inverse": {
    title: "app_icon_sunburst_black_inverse",
    description: "app_icon_sunburst_black_inverse_description",
  },
  dither: {
    title: "app_icon_dither",
    description: "app_icon_dither_description",
  },
  "dither-inverse": {
    title: "app_icon_dither_inverse",
    description: "app_icon_dither_inverse_description",
  },
  tangerine: {
    title: "app_icon_tangerine",
    description: "app_icon_tangerine_description",
  },
  "tangerine-inverse": {
    title: "app_icon_tangerine_inverse",
    description: "app_icon_tangerine_inverse_description",
  },
};

/**
 * Reads the active icon from the OS. Android reports the icon of the running
 * activity, so a change shows only after the app restarts. The screen keeps
 * its own state after a change.
 */
const readActiveAppIcon = (): AppIconId => {
  if (!supportsAlternateIcons) {
    return "default";
  }
  const nativeName = getAppIconName();
  return (
    APP_ICONS.find((icon) => icon.nativeName === nativeName)?.id ?? "default"
  );
};

const reportAppIconError = ({
  icon,
  cause,
}: {
  icon: AppIcon;
  cause: unknown;
}) => {
  const error = createStructuredError({
    status: "app_icon_change_failed",
    message: "App icon could not be changed",
    why: `expo-alternate-app-icons failed for "${icon.id}": ${cause instanceof Error ? cause.message : String(cause)}`,
    fix: "Try again. If it fails again, restart Pixy and choose the icon again",
  });
  console.error(error);
  Sentry.captureException(error);
};

const AppIconRow = ({
  icon,
  isSelected,
  isLocked,
  isLast,
  onSelect,
}: {
  icon: AppIcon;
  isSelected: boolean;
  isLocked: boolean;
  isLast: boolean;
  onSelect: (icon: AppIcon) => void;
}) => {
  const colors = useColors();
  const title = t(LABELS[icon.id].title);
  const description = t(LABELS[icon.id].description);
  const statusLabel = isLocked ? t("app_icon_locked") : undefined;

  const trailing = () => {
    if (isLocked) {
      return <Lock size={22} color={colors.textSecondary} aria-hidden />;
    }
    if (isSelected) {
      return (
        <CircleCheck
          size={26}
          color={colors.background}
          fill={colors.tint}
          aria-hidden
        />
      );
    }
    return (
      <Circle
        size={26}
        color={colors.textSecondary}
        strokeWidth={1.5}
        aria-hidden
      />
    );
  };

  return (
    <Pressable
      onPress={() => onSelect(icon)}
      disabled={isLocked}
      accessibilityRole="radio"
      accessibilityLabel={[title, description, statusLabel]
        .filter(Boolean)
        .join(", ")}
      accessibilityState={{
        selected: isSelected,
        checked: isSelected,
        disabled: isLocked,
      }}
      testID={`app-icon-${icon.id}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        marginHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.menuListItemBorder,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: PREVIEW_SIZE,
          height: PREVIEW_SIZE,
          // iOS icons use a continuous squircle, Pixel launchers a circle.
          borderRadius:
            Platform.OS === "android"
              ? PREVIEW_SIZE / 2
              : PREVIEW_SIZE * 0.2237,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.menuListItemBorder,
          overflow: "hidden",
          opacity: isLocked ? 0.6 : 1,
        }}
      >
        <Image
          source={icon.preview}
          accessibilityIgnoresInvertColors
          style={{ width: "100%", height: "100%" }}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }}>
          {title}
        </Text>
        <Text
          style={{ fontSize: 15, color: colors.textSecondary, marginTop: 2 }}
        >
          {description}
        </Text>
      </View>
      <View style={{ width: 28, alignItems: "center" }}>{trailing()}</View>
    </Pressable>
  );
};

/**
 * Settings > App Icon: pick the home screen icon. New icons stay locked until
 * the `app-icons` feature flag is on. The default icon is always available.
 */
export const AppIconScreen = () => {
  const colors = useColors();
  const haptics = useHaptics();
  const analytics = useAnalytics();
  const isAppIconsEnabled = useFeatureFlag("app-icons");
  const [activeId, setActiveId] = useState<AppIconId>(readActiveAppIcon);

  const isLocked = (icon: AppIcon) =>
    !supportsAlternateIcons || (icon.isFlagged && !isAppIconsEnabled);

  const applyIcon = async (icon: AppIcon) => {
    try {
      await setAlternateAppIcon(icon.nativeName);
    } catch (error) {
      reportAppIconError({ icon, cause: error });
      Alert.alert(t("app_icon_error_title"), t("app_icon_error_message"));
      return;
    }
    setActiveId(icon.id);
    analytics.track("settings:app_icon_changed", { icon: icon.id });
  };

  const selectIcon = async (icon: AppIcon) => {
    if (isLocked(icon) || icon.id === activeId) {
      return;
    }
    await haptics.selection();
    if (Platform.OS !== "android") {
      await applyIcon(icon);
      return;
    }
    // Android switches icons by disabling the running activity, so Pixy
    // closes. Ask first.
    Alert.alert(t("app_icon_android_title"), t("app_icon_android_message"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("app_icon_android_confirm"),
        onPress: () => applyIcon(icon),
      },
    ]);
  };

  const hasLockedIcons = APP_ICONS.some(
    (icon) => isLocked(icon) && icon.id !== activeId
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ padding: 20, flex: 1 }}
        accessibilityRole="radiogroup"
      >
        <MenuList>
          {APP_ICONS.map((icon, index) => (
            <AppIconRow
              key={icon.id}
              icon={icon}
              isSelected={icon.id === activeId}
              // The active icon stays selected after the flag turns off, so
              // the user sees it and can switch back to Default.
              isLocked={isLocked(icon) && icon.id !== activeId}
              isLast={index === APP_ICONS.length - 1}
              onSelect={selectIcon}
            />
          ))}
        </MenuList>
        {hasLockedIcons && (
          <View testID="app-icon-locked-info">
            <TextInfo>
              {supportsAlternateIcons
                ? t("app_icon_locked_info")
                : t("app_icon_unsupported")}
            </TextInfo>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
