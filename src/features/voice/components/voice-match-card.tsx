import { useEffect } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RADIUS } from "@/constants/radius";
import { SHADOW } from "@/constants/shadow";
import { EMOTIONS, EmotionIndicator } from "@/features/logger";
import { PersonAvatar, usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import useScale from "@/hooks/use-scale";
import { Body, Secondary } from "@/components/type";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import type { VoiceMatch } from "../match-transcript";
import type { MoodTrigger } from "../mood-triggers";

const KIND_LABEL = {
  person: "voice_kind_person",
  tag: "voice_kind_tag",
  emotion: "voice_kind_emotion",
} as const;

/** Cards bob this far up and down, in points. */
const FLOAT = 3;
/** Cards tilt this far each way, in degrees. */
const TILT = 1.2;
/** One bob from low to high, in ms. */
const FLOAT_MS = 2400;
/**
 * One tilt from side to side, in ms. Not a multiple of `FLOAT_MS`: in step,
 * bob and tilt cancel at one edge and the card looks hinged there. Apart,
 * the card turns around its center.
 */
const TILT_MS = 3100;

// Pops in from small, like a thought surfacing.
const popIn = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.6 }] },
    animations: {
      opacity: withTiming(1, { duration: 180 }),
      transform: [{ scale: withSpring(1, { damping: 14, stiffness: 180 }) }],
    },
  };
};

// Stable small number per card, so drift survives list reorders.
const seedOf = (id: string) => {
  let seed = 0;
  for (const char of id) {
    seed = (seed * 31 + (char.codePointAt(0) ?? 0)) % 997;
  }
  return seed;
};

// Swings 0.5 → 0 → 1 → 0 … forever: starts level, eases in.
const swing = (duration: number, delay: number) => {
  const easing = Easing.inOut(Easing.sin);
  return withDelay(
    delay,
    withSequence(
      withTiming(0, { duration: duration / 2, easing }),
      withRepeat(withTiming(1, { duration, easing }), -1, true)
    )
  );
};

/**
 * Idle drift: each card bobs and turns around its center, on two separate
 * clocks. Tilt direction and start delay come from the card id, so cards
 * never move in step. Reduced motion: still.
 */
const useFloatStyle = (id: string) => {
  const seed = seedOf(id);
  const isReduced = useReducedMotion();
  // 0.5 is level: the card lands flat, then eases into the drift.
  const bob = useSharedValue(0.5);
  const turn = useSharedValue(0.5);
  useEffect(() => {
    if (isReduced) {
      return;
    }
    const delay = (seed % 4) * 400;
    bob.set(swing(FLOAT_MS, delay));
    turn.set(swing(TILT_MS, delay));
  }, [bob, isReduced, seed, turn]);
  const tilt = seed % 2 === 0 ? TILT : -TILT;
  return useAnimatedStyle(() => ({
    transform: [
      { translateY: (bob.get() * 2 - 1) * FLOAT },
      { rotate: `${(turn.get() * 2 - 1) * tilt}deg` },
    ],
  }));
};

const Dot = ({ color }: { color: string }) => (
  <View
    style={{
      width: 12,
      height: 12,
      marginHorizontal: 6,
      borderRadius: RADIUS.full,
      backgroundColor: color,
    }}
  />
);

const Marker = ({ match }: { match: VoiceMatch }) => {
  const colors = useColors();
  const { people } = usePeopleState();
  const { tags } = useTagsState();

  if (match.kind === "person") {
    const person = people.find((item) => item.id === match.id);
    return person ? <PersonAvatar person={person} size={24} /> : null;
  }
  if (match.kind === "tag") {
    const tag = tags.find((item) => item.id === match.id);
    return (
      <Dot
        color={(tag && colors.tags[tag.color]?.dot) ?? colors.textSecondary}
      />
    );
  }
  const emotion = EMOTIONS.find((item) => item.key === match.id);
  return emotion ? (
    <View style={{ width: 24, alignItems: "center" }}>
      <EmotionIndicator emotion={emotion} />
    </View>
  ) : null;
};

const Card = ({
  marker,
  title,
  kind,
  testID,
}: {
  marker: ReactNode;
  title: string;
  kind: string;
  testID: string;
}) => {
  const colors = useColors();
  const isReduced = useReducedMotion();
  const floatStyle = useFloatStyle(testID);

  return (
    // Outer view owns enter, exit, and reflow. Inner view owns the drift.
    // One transform each, so they never fight.
    <Animated.View
      entering={isReduced ? FadeIn.duration(150) : popIn}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition.springify().damping(18)}
    >
      <Animated.View
        accessible
        accessibilityLabel={`${kind}: ${title}`}
        testID={testID}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: RADIUS.md,
            borderCurve: "continuous",
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            boxShadow: SHADOW.photoCard,
          },
          floatStyle,
        ]}
      >
        {marker}
        <View style={{ flex: 1 }}>
          <Body>{title}</Body>
          <Secondary>{kind}</Secondary>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

/** One detected person, tag, or emotion, as a card in voice mode. */
export const VoiceMatchCard = ({ match }: { match: VoiceMatch }) => (
  <Card
    marker={<Marker match={match} />}
    title={match.text}
    kind={t(KIND_LABEL[match.kind])}
    testID={`voice-match-${match.kind}-${match.id}`}
  />
);

/** Spoken mood, as a card in voice mode. Dot in the user's scale color. */
export const VoiceMoodCard = ({ mood }: { mood: MoodTrigger }) => {
  const scale = useScale(useSetting("scaleType"));

  return (
    <Card
      marker={<Dot color={scale.colors[mood.rating].background} />}
      // Trigger words are lowercase in most languages.
      title={mood.text.charAt(0).toLocaleUpperCase() + mood.text.slice(1)}
      kind={t("mood")}
      testID={`voice-match-mood-${mood.rating}`}
    />
  );
};
