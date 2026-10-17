import { Image } from "expo-image";
import { MapPin } from "lucide-react-native";
import { useEffect, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { PixelRatio, StyleSheet, useColorScheme, View } from "react-native";
import useColors from "@/hooks/useColors";
import type { LogLocation } from "@/types";
import type { SnapshotRequest } from "../mapSnapshot";
import { getSnapshot, getSnapshotFileName, loadSnapshot } from "../mapSnapshot";
import { PlacePreviewPlaceholder } from "./PlacePreviewPlaceholder";

const PIN_SIZE = 32;

/**
 * Lifts the pin so its tip, not its middle, marks the place. The `MapPin`
 * tip sits at y 22 of its 24-point view box.
 */
const PIN_OFFSET = -(PIN_SIZE * 10) / 24;

interface Size {
  width: number;
  height: number;
}

const toRequest = ({
  latitude,
  longitude,
  size,
  colorScheme,
}: {
  latitude: number;
  longitude: number;
  size: Size;
  colorScheme: SnapshotRequest["colorScheme"];
}): SnapshotRequest => ({
  latitude,
  longitude,
  width: size.width,
  height: size.height,
  scale: PixelRatio.get(),
  colorScheme,
});

/**
 * Still Apple Maps image of a stored place for previews in lists. A live map
 * view per card costs memory, GPU, and frames while scrolling; the image
 * costs one native render per place, then comes from disk
 * (`../mapSnapshot.ts`). Shows the pin placeholder until the image exists,
 * and after a failure.
 */
export const PlacePreviewMap = ({ location }: { location: LogLocation }) => {
  const colors = useColors();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const [size, setSize] = useState<Size | null>(null);
  const [loaded, setLoaded] = useState<{
    fileName: string;
    uri: string | null;
  } | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const { latitude, longitude } = location;
  const request =
    size === null
      ? null
      : toRequest({ latitude, longitude, size, colorScheme });
  const fileName = request === null ? null : getSnapshotFileName(request);
  // FlashList reuses this component for other cards: state of another
  // place never counts.
  let uri: string | null | undefined;
  if (request !== null) {
    uri = loaded?.fileName === fileName ? loaded.uri : getSnapshot(request);
  }

  useEffect(() => {
    if (size === null || uri !== undefined) {
      return;
    }
    const pendingRequest = toRequest({
      latitude,
      longitude,
      size,
      colorScheme,
    });
    let active = true;
    const load = async () => {
      const result = await loadSnapshot(pendingRequest);
      if (active) {
        setLoaded({
          fileName: getSnapshotFileName(pendingRequest),
          uri: result,
        });
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [colorScheme, latitude, longitude, size, uri]);

  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    const width = Math.round(layout.width);
    const height = Math.round(layout.height);
    if (width > 0 && height > 0) {
      setSize((current) =>
        current?.width === width && current.height === height
          ? current
          : { width, height }
      );
    }
  };

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {uri !== undefined && uri !== null && uri !== failedUri ? (
        <>
          <Image
            source={uri}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            recyclingKey={fileName}
            // The file is already on disk: no second copy in the image cache.
            cachePolicy="memory"
            onError={() => setFailedUri(uri)}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            {/* Offset on a wrapper: react-native-svg applies a transform style
                to both the Svg view and its content, which doubled the lift
                and clipped the top of the pin. */}
            <View style={{ transform: [{ translateY: PIN_OFFSET }] }}>
              <MapPin
                size={PIN_SIZE}
                color="white"
                fill={colors.tint}
                strokeWidth={1.5}
              />
            </View>
          </View>
        </>
      ) : (
        <PlacePreviewPlaceholder />
      )}
    </View>
  );
};
