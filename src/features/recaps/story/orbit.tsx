import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { ProfileAvatar, useProfile } from "@/features/profile";
import { t } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import { OrbitPersonMonth } from "./orbit-person";
import type { OrbitOrigin } from "./orbit-person";
import { SlideCard, SlideHeader, StoryText } from "./parts";
import {
  getStoryTheme,
  STORY_PALETTE,
  STORY_SCREEN_PADDING,
  titleRevealEnd,
} from "./theme";
import type { StoryTheme } from "./theme";
import type { OrbitSlide } from "./types";
import { firstName, ORBIT_SIZE, placePlanets } from "./orbit-layout";
import type { Planet } from "./orbit-layout";
import type { SlideContext } from "./slides";

/** Space between avatar and name, in points. */
const NAME_GAP = 4;
/** Extra width a name may use beyond its planet, in points. */
const NAME_OVERHANG = 24;

/** One full turn of the system, in milliseconds: about 40° per slide. */
const TURN_MS = 60_000;
/** Extra turn the system eases out of when the slide opens, radians (30°). */
const SETTLE = Math.PI / 6;
/** Rings and the user's avatar fade in this long, after the title. */
const RINGS_MS = 600;
/** Time to ease out of `SETTLE`, in milliseconds. */
const SETTLE_MS = 2500;
/** One bob up and down, in milliseconds. */
const FLOAT_MS = 6000;
/** Bob height, in points. */
const FLOAT = 3;

/**
 * `turn` runs 0 to 1 once per `TURN_MS`, forever: a slow, steady spin.
 * `settle` eases from 1 to 0 after `delay`, so the people swing in
 * and slows into the spin. `float` runs 0 to 1 per bob. All hold still
 * with reduce motion on.
 */
const useOrbitMotion = (delay: number) => {
  const isReduced = useReducedMotion();
  const turn = useSharedValue(0);
  const settle = useSharedValue(isReduced ? 0 : 1);
  const float = useSharedValue(0);
  useEffect(() => {
    if (isReduced) {
      settle.set(0);
      return;
    }
    const forever = (duration: number) =>
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1);
    turn.set(forever(TURN_MS));
    float.set(forever(FLOAT_MS));
    settle.set(
      withDelay(
        delay,
        withTiming(0, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) })
      )
    );
  }, [isReduced, turn, settle, float, delay]);
  return { turn, settle, float };
};

/** Where a planet sits now, relative to the orbit center. */
const planetOffset = (planet: Planet, turn: number, settle: number) => {
  "worklet";
  const angle = planet.angle + turn * 2 * Math.PI - settle * SETTLE;
  return {
    x: Math.cos(angle) * planet.radius,
    y: Math.sin(angle) * planet.radius,
  };
};

/**
 * One person on their orbit. The whole system turns as one, so planets
 * keep their spacing; each bobs on its own beat. Avatars stay upright.
 */
const PlanetView = ({
  planet,
  index,
  center,
  turn,
  settle,
  float,
  theme,
  delay,
  onPress,
}: {
  planet: Planet;
  index: number;
  center: number;
  turn: SharedValue<number>;
  settle: SharedValue<number>;
  float: SharedValue<number>;
  theme: StoryTheme;
  /** When people start to swing in, in milliseconds. */
  delay: number;
  onPress: () => void;
}) => {
  const style = useAnimatedStyle(() => {
    const { x, y } = planetOffset(planet, turn.get(), settle.get());
    const bob = Math.sin(float.get() * 2 * Math.PI + index) * FLOAT;
    return {
      transform: [{ translateX: x }, { translateY: y + bob }],
    };
  });
  const width = planet.size + NAME_OVERHANG * 2;
  // The spin moves the outer view itself: Android only sends touches to
  // children inside their parent's bounds, so a moved child gets no taps.
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: center - width / 2,
          top: center - planet.size / 2,
          width,
        },
        style,
      ]}
    >
      <Animated.View
        entering={FadeIn.delay(delay + index * 90).duration(500)}
        style={{ alignItems: "center" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${planet.person.name}, ${t("recaps_story_people_days", { count: planet.days })}`}
          hitSlop={8}
          onPress={onPress}
          testID={`recap-story-orbit-${planet.person.id}`}
        >
          <RingedAvatar person={planet.person} size={planet.size} />
        </Pressable>
        <View style={{ position: "absolute", top: planet.size + NAME_GAP }}>
          <StoryText
            kind="label"
            theme={theme}
            tone="muted"
            numberOfLines={1}
            style={{ maxWidth: width, textAlign: "center" }}
          >
            {firstName(planet.person.name)}
          </StoryText>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

/** Faint ring per orbit, so the system reads as one. */
const OrbitRings = ({
  planets,
  width,
  theme,
}: {
  planets: Planet[];
  width: number;
  theme: StoryTheme;
}) => {
  const radii = [
    ...new Set(planets.map((planet) => Math.round(planet.radius))),
  ];
  return (
    <Svg width={width} height={width} style={{ position: "absolute" }}>
      {radii.map((radius) => (
        <Circle
          key={radius}
          cx={width / 2}
          cy={width / 2}
          r={radius}
          stroke={STORY_PALETTE[theme].text}
          strokeOpacity={0.1}
          strokeWidth={1}
          fill="none"
        />
      ))}
    </Svg>
  );
};

/**
 * The user's avatar in the middle, `people` around like planets. Bigger:
 * more days connected. Closer: more days, or `closeness`. Says nothing about how the days felt. A tap
 * on a person shows their days in `ctx.period` until the user taps again.
 * Fills a `width` square. People swing in after `delay`.
 */
export const OrbitSystem = ({
  people,
  ctx,
  width,
  delay,
  closeness,
}: {
  /** First person sits at the top. */
  people: OrbitSlide["people"];
  ctx: SlideContext;
  width: number;
  /** When the rings and the user's avatar fade in, in milliseconds. */
  delay: number;
  /** Picks each person's orbit, 0 to 1, 1 nearest. Default: share of days. */
  closeness?: (personId: string) => number;
}) => {
  const profile = useProfile();
  const [selected, setSelected] = useState<{
    planet: Planet;
    origin: OrbitOrigin;
  } | null>(null);
  const peopleAt = delay + RINGS_MS;
  const { turn, settle, float } = useOrbitMotion(peopleAt);
  const theme = getStoryTheme(ctx.isDark);
  const planets = placePlanets(people, ctx.people, width, closeness);
  const self = Math.round(width * ORBIT_SIZE.self);
  return (
    <>
      {selected && (
        <OrbitPersonMonth
          person={selected.planet.person}
          days={selected.planet.days}
          width={width}
          origin={selected.origin}
          ctx={ctx}
          onClose={() => setSelected(null)}
        />
      )}
      {/* Stays mounted under the month, so the spin keeps its place. */}
      <View
        style={[
          { width, height: width },
          selected && { position: "absolute", opacity: 0 },
        ]}
        pointerEvents={selected ? "none" : "box-none"}
        importantForAccessibility={selected ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={selected !== null}
      >
        <Animated.View
          entering={FadeIn.delay(delay).duration(RINGS_MS)}
          style={StyleSheet.absoluteFill}
        >
          <OrbitRings planets={planets} width={width} theme={theme} />
        </Animated.View>
        <Animated.View
          entering={FadeIn.delay(delay).duration(RINGS_MS)}
          style={{
            position: "absolute",
            left: (width - self) / 2,
            top: (width - self) / 2,
          }}
        >
          <ProfileAvatar
            size={self}
            photoUri={profile.photoUri}
            initials={profile.initials}
          />
        </Animated.View>
        {planets.map((planet, index) => (
          <PlanetView
            key={planet.person.id}
            planet={planet}
            index={index}
            center={width / 2}
            turn={turn}
            settle={settle}
            float={float}
            theme={theme}
            delay={peopleAt}
            onPress={() =>
              setSelected({
                planet,
                origin: planetOffset(planet, turn.get(), settle.get()),
              })
            }
          />
        ))}
      </View>
    </>
  );
};

/**
 * The month's people in orbit around the user. A tap on a person shows
 * their days in the month and holds the story until the user taps again.
 */
export const Orbit = ({
  slide,
  ctx,
}: {
  slide: OrbitSlide;
  ctx: SlideContext;
}) => {
  const { width: screen } = useWindowDimensions();
  const title = t("recaps_story_orbit_title");
  return (
    <>
      <SlideHeader theme={getStoryTheme(ctx.isDark)} title={title} />
      <SlideCard>
        <OrbitSystem
          people={slide.people}
          ctx={ctx}
          width={screen - 2 * STORY_SCREEN_PADDING}
          // Title first, then you and the rings, then people swing in.
          delay={titleRevealEnd(title)}
        />
      </SlideCard>
    </>
  );
};
