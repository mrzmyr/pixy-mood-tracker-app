import type { ComponentType } from "react";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Moon from "lucide-react-native/icons/moon";
import Sunrise from "lucide-react-native/icons/sunrise";
import Zap from "lucide-react-native/icons/zap";
import FlagHighlight from "@/components/flag-highlight";
import { SHADOW } from "@/constants/shadow";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import type { CheckInType } from "@/types";
import { SIZE } from "./float-button-metrics";

// Space between the add button and the lowest option, and between options.
const GAP = 12;
const OPTION_HEIGHT = 48;
// Stagger of the options, lowest first, like a speed dial.
const STAGGER_MS = 30;

const OPTIONS: {
  type: CheckInType;
  icon: ComponentType<{ width: number; height: number; color: string }>;
  label: () => string;
}[] = [
  {
    type: "morning_intention",
    icon: Sunrise,
    label: () => t("check_in_type_morning_intention"),
  },
  { type: "quick", icon: Zap, label: () => t("check_in_type_quick") },
  {
    type: "evening_reflection",
    icon: Moon,
    label: () => t("check_in_type_evening_reflection"),
  },
];

/**
 * Speed dial above the calendar add button: one pill per check-in type,
 * over a dimmed backdrop. A tap on the backdrop or Android back closes it.
 * Render only while open; options fade in from the add button.
 */
export const CheckInTypeMenu = ({
  onSelect,
  onClose,
}: {
  onSelect: (type: CheckInType) => void;
  onClose: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      }
    );
    return () => subscription.remove();
  }, [onClose]);

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(150)}
        style={[StyleSheet.absoluteFill, { zIndex: 90 }]}
      >
        <Pressable
          testID="check-in-type-menu-backdrop"
          accessibilityRole="button"
          accessibilityLabel={t("close")}
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.checkInMenuBackdrop },
          ]}
        />
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 20,
          bottom: 20 + insets.bottom + SIZE + GAP,
          zIndex: 95,
          alignItems: "flex-end",
          gap: GAP,
        }}
      >
        <FlagHighlight flag="check-in-types">
          <View style={{ alignItems: "flex-end", gap: GAP }}>
            {OPTIONS.map(({ type, icon: Icon, label }, index) => (
              <Animated.View
                key={type}
                entering={FadeInDown.duration(200).delay(
                  (OPTIONS.length - 1 - index) * STAGGER_MS
                )}
                exiting={FadeOut.duration(120)}
              >
                <Pressable
                  testID={`check-in-type-${type}`}
                  accessibilityRole="button"
                  accessibilityLabel={label()}
                  onPress={() => onSelect(type)}
                  android_ripple={{
                    color: "rgba(255, 255, 255, 0.24)",
                    foreground: true,
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    height: OPTION_HEIGHT,
                    paddingHorizontal: 20,
                    borderRadius: OPTION_HEIGHT / 2,
                    overflow: "hidden",
                    backgroundColor: colors.primaryButtonBackground,
                    boxShadow: SHADOW.float,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Icon
                    width={20}
                    height={20}
                    color={colors.primaryButtonText}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.primaryButtonText,
                    }}
                  >
                    {label()}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </FlagHighlight>
      </View>
    </>
  );
};

/**
 * Open state of the check-in type menu and where each type goes. Without
 * flag `check-in-types`, `isEnabled` is false and + keeps opening the logger.
 * Morning intention and evening reflection open the logger with their type;
 * quick opens the quick check-in screen.
 */
export const useCheckInTypeMenu = ({
  hasTodayEntry,
}: {
  hasTodayEntry: boolean;
}) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const isEnabled = useFeatureFlag("check-in-types");
  const [isOpen, setIsOpen] = useState(false);
  // Flag turned off while open: start closed when it turns on again.
  const [wasEnabled, setWasEnabled] = useState(isEnabled);
  if (wasEnabled !== isEnabled) {
    setWasEnabled(isEnabled);
    setIsOpen(false);
  }

  const handleClose = useCallback(() => setIsOpen(false), []);

  const toggle = () => {
    if (!isOpen) {
      analytics.track("calendar:check_in_menu_opened", {
        has_entries: hasTodayEntry,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (type: CheckInType) => {
    setIsOpen(false);
    analytics.track("calendar:check_in_type_tapped", {
      check_in_type: type,
      has_entries: hasTodayEntry,
    });
    if (type === "quick") {
      router.push("/check-in/new");
      return;
    }
    router.push({
      pathname: "/logs/create/[dateTime]",
      params: { dateTime: dayjs().toISOString(), checkInType: type },
    });
  };

  return {
    isEnabled,
    isOpen: isEnabled && isOpen,
    /** For `CalendarFloatButton`: `undefined` while the flag is off. */
    floatButtonOpen: isEnabled ? isOpen : undefined,
    toggle,
    handleClose,
    handleSelect,
  };
};
