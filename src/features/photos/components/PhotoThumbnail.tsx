import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { LogPhoto } from "@/types";
import { getPhotoFile } from "../storage";

/**
 * Square photo tile with radius 12. Shows an `ImageOff` placeholder when the
 * file is missing or unreadable, for example after an import from another
 * device. Never removes the reference itself.
 *
 * Without `size`, the tile fills the width of its parent.
 */
export const PhotoThumbnail = ({
  photo,
  index,
  count,
  size,
  onPress,
}: {
  photo: LogPhoto;
  /** Position in the entry, from 0. Used for accessibility labels. */
  index: number;
  count: number;
  size?: number;
  onPress?: () => void;
}) => {
  const colors = useColors();
  const [hasLoadError, setHasLoadError] = useState(false);
  const file = getPhotoFile(photo);
  const isMissing = hasLoadError || !file.exists;
  const position = index + 1;

  return (
    <View style={{ width: size ?? "100%", aspectRatio: 1 }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "imagebutton" : "image"}
        accessibilityLabel={t("photos_thumbnail_label", {
          index: position,
          count,
        })}
        testID={`photo-thumbnail-${position}`}
        style={{
          flex: 1,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: colors.backgroundSecondary,
        }}
      >
        {isMissing ? (
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
        ) : (
          <Image
            source={{ uri: file.uri }}
            style={{ flex: 1 }}
            contentFit="cover"
            recyclingKey={photo.id}
            // Files are local already; a disk cache would only duplicate them.
            cachePolicy="memory"
            onError={() => setHasLoadError(true)}
          />
        )}
      </Pressable>
    </View>
  );
};
