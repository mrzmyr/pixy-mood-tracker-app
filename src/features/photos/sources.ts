import type { LogPhoto } from "@/types";

/** Photos per origin. Counts only, for analytics. */
export const countPhotosBySource = ({ photos }: { photos: LogPhoto[] }) => {
  const counts = { day: 0, library: 0 };
  for (const photo of photos) {
    counts[photo.source] += 1;
  }
  return counts;
};
