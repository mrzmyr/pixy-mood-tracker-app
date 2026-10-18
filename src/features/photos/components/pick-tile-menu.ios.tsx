import { Button, ContextMenu, Host, RNHostView } from "@expo/ui/swift-ui";
import { Image } from "expo-image";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { t } from "@/lib/translation";
import type { PickTileMenuProps } from "./pick-tile-menu-types";

/** iOS shows the native context menu preview on a long press. */
export const HAS_NATIVE_PREVIEW = true;

const PREVIEW_MARGIN = 32;
/** Portrait, like most phone photos, until the photo loads. */
const DEFAULT_ASPECT_RATIO = 3 / 4;

/**
 * Long press on a photo tile on iOS: the system context menu with a large
 * preview of the photo, like in Photos. Unchecked: "Select". Checked:
 * "View Photo" opens the viewer, "Unselect" unchecks. Neither deletes
 * the photo from the library.
 *
 * The preview mounts on the first touch, not with the tile: a full-size
 * image for every tile of the grid costs memory the user never sees.
 */
export const PickTileMenu = ({
  uri,
  recyclingKey,
  size,
  isChecked,
  onToggle,
  onOpen,
  children,
}: PickTileMenuProps) => {
  const { width, height } = useWindowDimensions();
  const [isArmed, setIsArmed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);

  const previewWidth = Math.min(
    width - PREVIEW_MARGIN,
    (height / 2) * aspectRatio
  );

  return (
    <Host style={{ width: size, height: size }}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <RNHostView>
            <View
              style={{ width: size, height: size }}
              onTouchStart={() => setIsArmed(true)}
            >
              {children}
            </View>
          </RNHostView>
        </ContextMenu.Trigger>
        {isArmed && (
          <ContextMenu.Preview>
            <RNHostView matchContents>
              <Image
                source={uri}
                recyclingKey={recyclingKey}
                style={{
                  width: previewWidth,
                  height: previewWidth / aspectRatio,
                }}
                contentFit="cover"
                // Decodes at preview size, not the full 48 MP original.
                enforceEarlyResizing
                cachePolicy="memory"
                accessibilityIgnoresInvertColors
                onLoad={({ source }) => {
                  if (source.width > 0 && source.height > 0) {
                    setAspectRatio(source.width / source.height);
                  }
                }}
              />
            </RNHostView>
          </ContextMenu.Preview>
        )}
        <ContextMenu.Items>
          {isChecked ? (
            <>
              <Button
                label={t("photos_pick_view")}
                systemImage="arrow.up.left.and.arrow.down.right"
                onPress={onOpen}
              />
              <Button
                label={t("photos_pick_unselect")}
                systemImage="circle"
                onPress={onToggle}
              />
            </>
          ) : (
            <Button
              label={t("photos_pick_select")}
              systemImage="checkmark.circle"
              onPress={onToggle}
            />
          )}
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
};
