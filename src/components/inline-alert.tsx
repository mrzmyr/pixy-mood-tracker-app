import { useEffect } from "react";
import { AccessibilityInfo, Platform, Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import CheckCircle from "lucide-react-native/icons/circle-check";
import Info from "lucide-react-native/icons/info";
import AlertTriangle from "lucide-react-native/icons/triangle-alert";
import LinkButton from "@/components/link-button";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";

/** Tone of an {@link InlineAlert}: sets icon and accent color. */
export type InlineAlertVariant = "error" | "warning" | "info" | "success";

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
} as const;

const ICON_SIZE = 20;
const GAP = 10;

/**
 * Inline message inside a screen or sheet, next to the content it is about.
 * Stays until the state changes; use `showToast` for short confirmations.
 *
 * Screen readers announce it when it appears: VoiceOver through
 * `announceForAccessibility`, TalkBack through the live region.
 * Text scales with Dynamic Type and font size settings.
 */
export const InlineAlert = ({
  variant = "error",
  title,
  message,
  action,
  testID,
  style,
}: {
  variant?: InlineAlertVariant;
  /** Short summary. Leave out when the message says it all. */
  title?: string;
  /** What happened and how to fix it. */
  message: string;
  /** Optional recovery step, for example retry. */
  action?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const { accent, background } = colors.alert[variant];
  const Icon = ICONS[variant];
  const handleActionPress = () => action?.onPress();
  const announcement = title ? `${title}. ${message}` : message;

  useEffect(() => {
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [announcement]);

  return (
    <View
      testID={testID}
      style={[
        {
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: RADIUS.md,
          backgroundColor: background,
        },
        style,
      ]}
    >
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion={variant === "error" ? "assertive" : "polite"}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: GAP }}
      >
        <Icon
          width={ICON_SIZE}
          height={ICON_SIZE}
          color={accent}
          // Icon sits on the first text line.
          style={{ marginTop: 1 }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          {title && (
            <Text
              style={{
                fontSize: 15,
                lineHeight: 20,
                fontWeight: "600",
                color: colors.text,
              }}
            >
              {title}
            </Text>
          )}
          <Text style={{ fontSize: 15, lineHeight: 20, color: colors.text }}>
            {message}
          </Text>
        </View>
      </View>
      {action && (
        <LinkButton
          testID={action.testID}
          onPress={handleActionPress}
          hitSlop={8}
          style={{
            alignSelf: "flex-start",
            marginLeft: ICON_SIZE + GAP,
            marginTop: 4,
            paddingHorizontal: 0,
            paddingBottom: 0,
            fontWeight: "600",
          }}
        >
          {action.label}
        </LinkButton>
      )}
    </View>
  );
};
