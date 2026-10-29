import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { RADIUS } from "@/constants/radius";
import type { Person } from "@/features/people";
import { ProfileAvatar, useProfile } from "@/features/profile";
import { t } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import { SlideHeader, StoryText } from "./parts";
import { STORY_PALETTE } from "./theme";
import type { OrbitSlide } from "./types";
import type { SlideContext } from "./slides";

/** Sizes as shares of the canvas width. */
const SIZE = {
  self: 0.22,
  /** Planet of the person with the fewest days. */
  planetMin: 0.1,
  /** Planet of the person with the most days. */
  planetMax: 0.17,
  /** Orbit radius of the person with the most days. */
  nearest: 0.31,
  /** Orbit radius of the person with the fewest days. */
  farthest: 0.44,
};

/** One full turn of the system, in milliseconds: about 40° per slide. */
const TURN_MS = 60_000;
/** Extra turn the system eases out of when the slide opens, radians (30°). */
const SETTLE = Math.PI / 6;
/** Time to ease out of `SETTLE`, in milliseconds. */
const SETTLE_MS = 2500;
/** One bob up and down, in milliseconds. */
const FLOAT_MS = 6000;
/** Bob height, in points. */
const FLOAT = 3;

/** Space between avatar and name, in points. */
const NAME_GAP = 4;
/** Extra width a name may use beyond its planet, in points. */
const NAME_OVERHANG = 24;

const lerp = (from: number, to: number, share: number) =>
  from + (to - from) * share;

interface Planet {
  person: Person;
  days: number;
  size: number;
  radius: number;
  /** Start angle, radians. */
  angle: number;
}

/**
 * Size and distance follow the share of the top person's days. Planets sit
 * evenly around the user, most days at the top, so neighbors never touch.
 */
const placePlanets = (
  slide: OrbitSlide,
  people: ReadonlyMap<string, Person>,
  width: number
): Planet[] => {
  const rows = slide.people.flatMap(({ personId, days }) => {
    const person = people.get(personId);
    return person ? [{ person, days }] : [];
  });
  const most = rows[0]?.days ?? 1;
  const least = rows.at(-1)?.days ?? most;
  return rows.map(({ person, days }, index) => {
    const share = most === least ? 1 : (days - least) / (most - least);
    return {
      person,
      days,
      size: Math.round(width * lerp(SIZE.planetMin, SIZE.planetMax, share)),
      radius: width * lerp(SIZE.farthest, SIZE.nearest, share),
      angle: -Math.PI / 2 + (index * 2 * Math.PI) / rows.length,
    };
  });
};

/**
 * `turn` runs 0 to 1 once per `TURN_MS`, forever: a slow, steady spin.
 * `settle` eases from 1 to 0 as the slide opens, so the system swings in
 * and slows into the spin. `float` runs 0 to 1 per bob. All hold still
 * with reduce motion on.
 */
const useOrbitMotion = () => {
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
      withTiming(0, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [isReduced, turn, settle, float]);
  return { turn, settle, float };
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
}: {
  planet: Planet;
  index: number;
  center: number;
  turn: SharedValue<number>;
  settle: SharedValue<number>;
  float: SharedValue<number>;
}) => {
  const style = useAnimatedStyle(() => {
    const angle =
      planet.angle + turn.get() * 2 * Math.PI - settle.get() * SETTLE;
    const bob = Math.sin(float.get() * 2 * Math.PI + index) * FLOAT;
    return {
      transform: [
        { translateX: Math.cos(angle) * planet.radius },
        { translateY: Math.sin(angle) * planet.radius + bob },
      ],
    };
  });
  const width = planet.size + NAME_OVERHANG * 2;
  return (
    <Animated.View
      entering={FadeIn.delay(250 + index * 90).duration(500)}
      style={{
        position: "absolute",
        left: center - width / 2,
        top: center - planet.size / 2,
        width,
      }}
    >
      <Animated.View style={[{ alignItems: "center" }, style]}>
        <RingedAvatar person={planet.person} size={planet.size} />
        <View style={{ position: "absolute", top: planet.size + NAME_GAP }}>
          <StoryText
            kind="label"
            theme="night"
            tone="muted"
            numberOfLines={1}
            style={{ maxWidth: width, textAlign: "center" }}
          >
            {planet.person.name}
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
}: {
  planets: Planet[];
  width: number;
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
          stroke={STORY_PALETTE.night.text}
          strokeOpacity={0.1}
          strokeWidth={1}
          fill="none"
        />
      ))}
    </Svg>
  );
};

/**
 * The user's avatar in the middle, the month's people around like planets.
 * Closer and bigger: more days connected. Says nothing about how the days
 * felt.
 */
export const Orbit = ({
  slide,
  ctx,
}: {
  slide: OrbitSlide;
  ctx: SlideContext;
}) => {
  const { width: screen } = useWindowDimensions();
  const profile = useProfile();
  const { turn, settle, float } = useOrbitMotion();
  const width = screen - 48;
  const planets = placePlanets(slide, ctx.people, width);
  const self = Math.round(width * SIZE.self);
  const label = planets
    .map(
      ({ person, days }) =>
        `${person.name}, ${t("recaps_story_people_days", { count: days })}`
    )
    .join(". ");
  return (
    <>
      <SlideHeader
        theme="night"
        eyebrow={t("recaps_story_orbit_eyebrow")}
        title={t("recaps_story_orbit_title")}
      />
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        style={{ width, height: width, marginTop: 24 }}
      >
        <OrbitRings planets={planets} width={width} />
        <View
          style={{
            position: "absolute",
            left: (width - self) / 2 - 3,
            top: (width - self) / 2 - 3,
            padding: 1,
            borderRadius: RADIUS.full,
            borderWidth: 2,
            borderColor: STORY_PALETTE.night.accent,
          }}
        >
          <ProfileAvatar
            size={self}
            photoUri={profile.photoUri}
            initials={profile.initials}
          />
        </View>
        {planets.map((planet, index) => (
          <PlanetView
            key={planet.person.id}
            planet={planet}
            index={index}
            center={width / 2}
            turn={turn}
            settle={settle}
            float={float}
          />
        ))}
      </View>
    </>
  );
};
