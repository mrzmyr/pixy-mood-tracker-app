import chroma from "chroma-js";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { CloudPixy } from "@/components/cloud-pixy";
import { SKY_DRIFT_SPEED, Sky } from "@/components/sky";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import { PlacePreviewMap } from "@/features/location";
import type { LogItem } from "@/features/logs";
import { getPhotoFile } from "@/features/photos";
import { usePixyIdle } from "./use-pixy-idle";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import {
  BENTO_PHOTOS_MAX,
  getPhotoBento,
  takeVisible,
} from "./entry-summary-layout";

/** Hero height; the mood header overlaps its faded bottom. */
export const HERO_HEIGHT = 340;
const HERO_FADE = 140;
/** Pixy sits in the upper sky, clear of the headline. */
const PIXY_TOP = 70;
const PIXY_BOB = 4;

const MosaicImage = ({ photo }: { photo: LogItem["photos"][number] }) => (
  <Image
    source={getPhotoFile(photo).uri}
    style={{ flex: 1 }}
    contentFit="cover"
    // Files are local already; a disk cache would only copy them.
    cachePolicy="memory"
    accessibilityIgnoresInvertColors
  />
);

/** Up to 5 photos edge to edge, then "+N" on the last one. */
const PhotoMosaic = ({ photos }: { photos: LogItem["photos"] }) => {
  const { rest } = takeVisible(photos, BENTO_PHOTOS_MAX);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t("logger_step_photos")}
      style={{ flex: 1, gap: 2 }}
    >
      {getPhotoBento(photos.length).map(({ flex, columns }) => (
        <View
          key={columns.flat().join(",")}
          style={{ flex, flexDirection: "row", gap: 2 }}
        >
          {columns.map((column) => (
            <View key={column.join(",")} style={{ flex: 1, gap: 2 }}>
              {column.map((index) => (
                <MosaicImage key={index} photo={photos[index]} />
              ))}
            </View>
          ))}
        </View>
      ))}
      {rest > 0 && (
        <View
          style={{
            position: "absolute",
            right: 12,
            // Above the fade, so the badge stays readable.
            bottom: HERO_FADE / 2,
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: RADIUS.full,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          {/* Badge on a photo: small so it covers little of it. */}
          <Label size={13} style={{ color: "#fff", fontWeight: "700" }}>
            +{rest}
          </Label>
        </View>
      )}
    </View>
  );
};

/** Cloud Pixy bobbing gently in the free sky above the headline. */
const FloatingPixy = () => {
  const bob = useSharedValue(0);
  const idle = usePixyIdle({ isEnabled: true, isReducedMotion: false });

  useEffect(() => {
    bob.set(
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, [bob]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (bob.get() - 0.5) * PIXY_BOB * 2 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: PIXY_TOP,
          alignSelf: "center",
          // Same as onboarding: Pixy floats in free sky, never over text.
        },
        style,
      ]}
    >
      <CloudPixy isBlinking={idle.isBlinking} />
    </Animated.View>
  );
};

/**
 * Sky for entries without photos or place: clouds by day, stars at night,
 * and cloud Pixy. Reduced motion: still sky, no Pixy (`Sky`, `CloudPixy`).
 */
const SkyHero = () => {
  const { height } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const speed = useSharedValue(SKY_DRIFT_SPEED);

  // The clouds sit low in the photo: pin the full-height sky to the bottom.
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height }}
      >
        <Sky speed={speed} />
      </View>
      {!isReducedMotion && <FloatingPixy />}
    </View>
  );
};

/**
 * Full-width picture at the top of the summary, fading into the page: the
 * entry's photos, else its place on a map, else the sky.
 */
export const SummaryHero = ({
  item,
  extraHeight,
}: {
  item: LogItem;
  /** Space under the status bar where the sheet does not cover it. */
  extraHeight: number;
}) => {
  const colors = useColors();
  const background = colors.summaryBackground;

  const picture = (() => {
    if (item.photos.length > 0) {
      return <PhotoMosaic photos={item.photos} />;
    }
    if (item.location) {
      return (
        <View style={{ flex: 1 }} pointerEvents="none">
          <PlacePreviewMap location={item.location} />
        </View>
      );
    }
    return <SkyHero />;
  })();

  return (
    <View style={{ height: HERO_HEIGHT + extraHeight, overflow: "hidden" }}>
      {picture}
      <LinearGradient
        pointerEvents="none"
        colors={[chroma(background).alpha(0).css(), background]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: HERO_FADE,
        }}
      />
    </View>
  );
};
