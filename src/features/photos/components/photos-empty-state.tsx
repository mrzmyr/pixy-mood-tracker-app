import { PhotosPromptCard } from "./photos-prompt-card";
import type { PhotosEmptyStateProps } from "./photos-empty-state-types";

/** Android and web never reach the empty day state; the card is the fallback. */
export const PhotosEmptyState = (props: PhotosEmptyStateProps) => (
  <PhotosPromptCard {...props} />
);
