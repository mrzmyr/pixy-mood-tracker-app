import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/**
 * Photo that fills a square tile. Shows an `ImageOff` placeholder when the
 * image cannot load, for example a stored file missing after an import
 * from another device.
 *
 * Tiles show photos of up to 48 MP (picked originals, library assets).
 * iOS decodes them at tile size (`enforceEarlyResizing`): without it,
 * expo-image decodes the full image and scales it down on the main thread
 * on every load. https://docs.expo.dev/versions/latest/sdk/image/#enforceearlyresizing
 * Android (Glide) always decodes at view size.
 */
export const TileImage = ({
  uri,
  recyclingKey,
}: {
  /** Stored photo file, picked file, or library asset (`ph://`). */
  uri: string;
  recyclingKey: string;
}) => {
  const colors = useColors();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (failedUri === uri) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 4,
        }}
      >
        <ImageOff color={colors.textSecondary} size={24} />
        <Text
          numberOfLines={2}
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {t("photos_missing")}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={uri}
      style={{ flex: 1 }}
      contentFit="cover"
      recyclingKey={recyclingKey}
      enforceEarlyResizing
      // Files are local already; a disk cache would only copy them.
      cachePolicy="memory"
      accessibilityIgnoresInvertColors
      onError={() => setFailedUri(uri)}
    />
  );
};
