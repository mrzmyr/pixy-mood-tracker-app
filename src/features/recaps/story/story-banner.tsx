import MaskedView from "@react-native-masked-view/masked-view";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Play from "lucide-react-native/icons/play";
import X from "lucide-react-native/icons/x";
import { Pressable, StyleSheet, useColorScheme, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Sky, SKY_DRIFT_SPEED } from "@/components/sky";
import { Heading, Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { StorySource } from "@/state/analytics/events";
import type { Period } from "../types";
import { dayRange, monthName } from "./format";
import { NightSparkle } from "./night-sparkle";
import { RunningBorder } from "./running-border";

/** Card height: label and play button on top, the big title below. */
const CARD_HEIGHT = 124;
/** Cloud photo height in the card: a little zoomed in, clouds keep their shape. */
const CARD_SKY_HEIGHT = 320;
/** The card shows this band of the photo, from its bottom: the cloud tops. */
const CARD_SKY_OFFSET = 60;
/** The year digits fill the card height and run off its right and bottom edge. */
const YEAR_SCALE = 1.7;

/** Blurred clouds, strongest at the bottom edge, gone by the middle. */
const BottomBlur = ({
  speed,
}: {
  speed: ReturnType<typeof useSharedValue<number>>;
}) => (
  <MaskedView
    pointerEvents="none"
    style={StyleSheet.absoluteFill}
    maskElement={
      <LinearGradient
        colors={["transparent", "black"]}
        locations={[0.25, 0.8]}
        style={StyleSheet.absoluteFill}
      />
    }
  >
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -CARD_SKY_OFFSET,
        height: CARD_SKY_HEIGHT,
      }}
    >
      <Sky speed={speed} height={CARD_SKY_HEIGHT} blurRadius={12} />
    </View>
  </MaskedView>
);

/** Milky wash over the blurred clouds, so the title sits on a calm base. */
const MilkWash = ({ isDark }: { isDark: boolean }) => (
  <LinearGradient
    pointerEvents="none"
    colors={[
      "rgba(255,255,255,0)",
      isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.45)",
    ]}
    locations={[0.2, 1]}
    style={StyleSheet.absoluteFill}
  />
);

/**
 * "Month Recap" over the month name on a drifting sky, with the recap card border and shadow. The
 * two year digits sit large and faint behind the title, and a soft light
 * creeps around the edge. Play button top right. Opens the month story full
 * screen. Week recaps open the week story the same way.
 */
export const StoryBanner = ({
  period,
  source,
  onClose,
}: {
  period: Period;
  source: StorySource;
  /** Shows a close button top right. Without it the card cannot be closed. */
  onClose?: () => void;
}) => {
  const router = useRouter();
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const speed = useSharedValue(SKY_DRIFT_SPEED);
  const isWeek = period.kind === "week";
  const label = isWeek
    ? t("recaps_story_banner_title_week")
    : t("recaps_story_banner_label_month");
  const title = isWeek
    ? dayRange(period.start, period.end)
    : monthName(period.start);
  // Deep sky navy by day, not black; white by night. Solid: AA contrast
  // on the lightest cloud.
  const ink = isDark ? "rgba(255,255,255,0.92)" : "#0F2A4A";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${title}, ${t("recaps_story_ready")}`}
      onPress={() =>
        router.push({
          pathname: "/recaps/story/[date]",
          params: {
            date: period.start,
            source,
            ...(isWeek && { kind: "week" }),
          },
        })
      }
      testID="recap-story-banner"
      style={({ pressed }) => ({
        height: CARD_HEIGHT,
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: RADIUS.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        // A little darker than the sky: the edge reads on light clouds and
        // on blue sky alike.
        borderColor: isDark ? colors.recapCardBorder : "rgba(10,40,80,0.16)",
        boxShadow: colors.recapCardShadow,
        overflow: "hidden",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Anchored to the bottom: blue sky on top, the cloud band below. */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -CARD_SKY_OFFSET,
          height: CARD_SKY_HEIGHT,
        }}
      >
        <Sky speed={speed} height={CARD_SKY_HEIGHT} />
      </View>
      <BottomBlur speed={speed} />
      <MilkWash isDark={isDark} />
      {isDark ? (
        <NightSparkle />
      ) : (
        // A touch deeper sky by day: more contrast for the title.
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(20,70,140,0.08)" },
          ]}
        />
      )}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          transformOrigin: "right bottom",
          // Pushed down: the digits start below the play button row and
          // run off the bottom edge.
          transform: [{ scale: YEAR_SCALE }, { translateY: 30 }],
        }}
      >
        <Heading
          size={72}
          style={{
            fontWeight: "800",
            letterSpacing: -2,
            color: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.45)",
          }}
        >
          {dayjs(period.start).format("YY")}
        </Heading>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* Same height as the label line: the button reads as its icon. */}
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: RADIUS.full,
            alignItems: "center",
            justifyContent: "center",
            // Frosted glass, not a solid disc: the sky shows through.
            backgroundColor: isDark
              ? "rgba(255,255,255,0.2)"
              : "rgba(255,255,255,0.55)",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isDark
              ? "rgba(255,255,255,0.3)"
              : "rgba(255,255,255,0.8)",
          }}
        >
          <Play
            width={9}
            height={9}
            color={ink}
            fill={ink}
            style={{ marginLeft: 1 }}
          />
        </View>
        <Label
          size={14}
          strong
          numberOfLines={1}
          style={{ flex: 1, color: ink }}
        >
          {label}
        </Label>
        {onClose && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            hitSlop={12}
            onPress={onClose}
            testID="recap-story-banner-close"
            style={({ pressed }) => ({
              width: 20,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <X width={18} height={18} color={ink} strokeWidth={2.25} />
          </Pressable>
        )}
      </View>
      <Heading
        size={isWeek ? 24 : 40}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ color: ink, fontWeight: "800", letterSpacing: -1 }}
      >
        {title}
      </Heading>
      <RunningBorder
        radius={RADIUS.lg}
        // Night sky is dark: full white would glare.
        color={isDark ? "rgba(255,255,255,0.6)" : "#FFFFFF"}
      />
    </Pressable>
  );
};
