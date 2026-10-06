import chroma from "chroma-js";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Text, View } from "react-native";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { formatLockScreenTime, formatReminderTime } from "../reminderTime";

const BEZEL_WIDTH = 6;
const SCREEN_RADIUS = 44;
const FADE_HEIGHT = 56;

/** Top of a lock screen, cut off at the bottom, showing the reminder at `time`. */
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
  const date = dayjs(time).format("dddd, D MMMM");
  const title = t("notification_reminder_title");
  const body = t("notification_reminder_body");

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
          paddingTop: 12,
          paddingHorizontal: 12,
        }}
      >
        <View
          style={{
            width: 84,
            height: 24,
            borderRadius: 12,
            backgroundColor: "#000",
          }}
        />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: "600",
            marginTop: 16,
          }}
          numberOfLines={1}
        >
          {date}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 64,
            fontWeight: "200",
            fontVariant: ["tabular-nums"],
            lineHeight: 72,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {clock}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "stretch",
            marginTop: 12,
            padding: 10,
            borderRadius: 20,
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              backgroundColor: colors.logCardBackground,
              width: 38,
              height: 38,
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            <Image
              style={{ width: 38, height: 38 }}
              source={require("../../../../assets/images/icon-notification.png")}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={{ color: colors.text, fontSize: 15, marginTop: 1 }}
              numberOfLines={2}
            >
              {body}
            </Text>
          </View>
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
