import chroma from "chroma-js";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { Image, Text, View } from "react-native";
import { locale, t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { formatLockScreenTime, formatReminderTime } from "../reminderTime";

// Pixel proportions: thin bezel, corners tighter than an iPhone.
const BEZEL_WIDTH = 5;
const SCREEN_RADIUS = 30;
const PUNCH_HOLE_SIZE = 13;
const FADE_HEIGHT = 56;
const CARD_RADIUS = 16;
const APP_ICON_SIZE = 16;

/**
 * Top of an Android (Pixel style) lock screen, cut off at the bottom,
 * showing the reminder at `time`.
 */
const NotificationPreview = ({
  time,
  enabled,
}: {
  time: Date;
  enabled: boolean;
}) => {
  const colors = useColors();

  const clock = formatLockScreenTime(time);
  // Screen readers get the day period the lock screen clock leaves out.
  const spokenTime = formatReminderTime(time);
  const date = dayjs(time).format("ddd, MMM D");
  const title = t("notification_reminder_title");
  const body = t("notification_reminder_body");
  // Localized "now" without a locale key.
  const now = useMemo(
    () =>
      new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
        0,
        "second"
      ),
    []
  );

  return (
    <View
      accessible
      accessibilityLabel={`${spokenTime}. ${title}. ${body}`}
      style={{ height: 260, overflow: "hidden", opacity: enabled ? 1 : 0.5 }}
      testID="reminder-preview"
    >
      <View
        style={{
          height: 260 + SCREEN_RADIUS,
          marginHorizontal: 24,
          borderWidth: BEZEL_WIDTH,
          borderColor: colors.backgroundSecondary,
          borderRadius: SCREEN_RADIUS + BEZEL_WIDTH,
          backgroundColor: colors.menuListItemBackground,
          alignItems: "center",
          paddingTop: 10,
          paddingHorizontal: 10,
        }}
      >
        <View
          style={{
            width: PUNCH_HOLE_SIZE,
            height: PUNCH_HOLE_SIZE,
            borderRadius: PUNCH_HOLE_SIZE / 2,
            backgroundColor: "#000",
          }}
        />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            fontWeight: "500",
            letterSpacing: 0.1,
            marginTop: 22,
          }}
          numberOfLines={1}
        >
          {date}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 76,
            fontWeight: "200",
            fontVariant: ["tabular-nums"],
            lineHeight: 84,
            letterSpacing: -1,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {clock}
        </Text>
        <View
          style={{
            alignSelf: "stretch",
            marginTop: 14,
            paddingHorizontal: 14,
            paddingTop: 10,
            paddingBottom: 12,
            borderRadius: CARD_RADIUS,
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                backgroundColor: colors.logCardBackground,
                width: APP_ICON_SIZE,
                height: APP_ICON_SIZE,
                borderRadius: APP_ICON_SIZE / 2,
                overflow: "hidden",
              }}
            >
              <Image
                style={{ width: APP_ICON_SIZE, height: APP_ICON_SIZE }}
                source={require("../../../../assets/images/icon-notification.png")}
                resizeMode="contain"
              />
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                marginLeft: 6,
              }}
              numberOfLines={1}
            >
              {`Pixy · ${now}`}
            </Text>
          </View>
          <Text
            style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={{ color: colors.text, fontSize: 14, marginTop: 2 }}
            numberOfLines={2}
          >
            {body}
          </Text>
        </View>
      </View>
      <LinearGradient
        colors={[chroma(colors.background).alpha(0).css(), colors.background]}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: FADE_HEIGHT,
        }}
      />
    </View>
  );
};

export default NotificationPreview;
