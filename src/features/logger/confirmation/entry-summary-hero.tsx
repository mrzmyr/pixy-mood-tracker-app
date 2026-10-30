import { Image } from "expo-image";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { RADIUS } from "@/constants/radius";
import { PlacePreviewMap } from "@/features/location";
import type { LogItem } from "@/features/logs";
import { getPhotoFile } from "@/features/photos";
import { t } from "@/lib/translation";
import {
  BENTO_PHOTOS_MAX,
  getPhotoBento,
  hasHero,
  takeVisible,
} from "./entry-summary-layout";

/** Hero height; the mood header overlaps its faded bottom. */
export const HERO_HEIGHT = 340;
const HERO_FADE = 140;

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
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
            +{rest}
          </Text>
        </View>
      )}
    </View>
  );
};

/** Mask over the hero: opaque, then fading to see-through at the bottom. */
const HeroFadeMask = () => (
  <View style={{ flex: 1 }}>
    <View style={{ flex: 1, backgroundColor: "#000" }} />
    <LinearGradient
      colors={["#000", "transparent"]}
      style={{ height: HERO_FADE }}
    />
  </View>
);

/**
 * Full-width picture at the top of the summary: the entry's photos, else
 * its place on a map. Fades out at the bottom so the sky behind the screen
 * shows through. Nothing without either; see {@link hasHero}.
 */
export const SummaryHero = ({
  item,
  extraHeight,
}: {
  item: LogItem;
  /** Space under the status bar where the sheet does not cover it. */
  extraHeight: number;
}) => {
  if (!hasHero(item)) {
    return null;
  }

  return (
    <MaskedView
      style={{ height: HERO_HEIGHT + extraHeight }}
      maskElement={<HeroFadeMask />}
    >
      {item.photos.length > 0 ? (
        <PhotoMosaic photos={item.photos} />
      ) : (
        item.location && (
          <View style={{ flex: 1 }} pointerEvents="none">
            <PlacePreviewMap location={item.location} />
          </View>
        )
      )}
    </MaskedView>
  );
};
