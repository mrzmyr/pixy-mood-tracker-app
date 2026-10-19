import { ContentUnavailableView, Host } from "@expo/ui/swift-ui";
import { Platform, View } from "react-native";
import { PhotosPromptCard } from "./photos-prompt-card";
import type { PhotosEmptyStateProps } from "./photos-empty-state-types";

/** `ContentUnavailableView` needs iOS 17. The app still supports 16.4. */
const IS_CONTENT_UNAVAILABLE_SUPPORTED =
  Number(String(Platform.Version).split(".")[0]) >= 17;

/**
 * No photos of the day on iOS: the system empty state, like Photos shows
 * for an empty album. Icon, title, and description in the system style, so
 * it does not read as a second heading below "Photos from …". iOS 16 falls
 * back to the card.
 */
export const PhotosEmptyState = ({
  testID,
  title,
  body,
}: PhotosEmptyStateProps) => {
  if (!IS_CONTENT_UNAVAILABLE_SUPPORTED) {
    return <PhotosPromptCard testID={testID} title={title} body={body} />;
  }
  return (
    <View testID={testID} accessible accessibilityLabel={`${title}. ${body}`}>
      <Host matchContents={{ vertical: true }}>
        <ContentUnavailableView
          title={title}
          description={body}
          systemImage="photo.on.rectangle"
        />
      </Host>
    </View>
  );
};
