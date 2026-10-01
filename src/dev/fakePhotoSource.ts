import { Asset } from "expo-asset";
import noop from "lodash/noop";
import type { PhotoSource } from "@/features/photos";
import { createStructuredError } from "@/lib/errors";

// Generated with ffmpeg's `gradients` source, 1200x1600. Required only from
// `src/dev`, so production bundles never contain them.
const SAMPLES = [
  require("../../assets/images/dev/sample-photo-1.jpg"),
  require("../../assets/images/dev/sample-photo-2.jpg"),
  require("../../assets/images/dev/sample-photo-3.jpg"),
];

const SAMPLE_WIDTH = 1200;
const SAMPLE_HEIGHT = 1600;

// Bundled assets have no file URI until downloaded into the cache.
const loadSample = async (module: number) => {
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) {
    throw createStructuredError({
      status: "fake_photo_unavailable",
      message: "Sample photo could not be loaded",
      why: `Asset ${asset.name} has no local file after download`,
      fix: "Rebuild the preview app so it bundles assets/images/dev",
    });
  }
  return { uri: asset.localUri, width: SAMPLE_WIDTH, height: SAMPLE_HEIGHT };
};

/**
 * Stands in for the library picker, camera, and photo library in preview
 * builds: returns bundled sample photos without system screens or
 * permission dialogs. The picker returns up to 3 photos, the camera always
 * 1, and every day holds the 3 samples. Library access is always granted.
 */
export const fakePhotoSource: PhotoSource = {
  pickFromLibrary: ({ limit }) =>
    Promise.all(SAMPLES.slice(0, Math.max(limit, 0)).map(loadSample)),
  takePhoto: () => loadSample(SAMPLES[0]),
  getLibraryPermission: () => Promise.resolve("granted"),
  requestLibraryPermission: () => Promise.resolve("granted"),
  manageLibraryAccess: () => Promise.resolve(),
  // The samples never change.
  addLibraryListener: () => noop,
  listPhotosOnDate: async () => {
    const samples = await Promise.all(SAMPLES.map(loadSample));
    return samples.map(({ uri }, index) => ({
      id: `sample-photo-${index + 1}`,
      uri,
    }));
  },
  // Sample files sit in the cache already, so the preview URI imports as is.
  getLibraryPhotoUri: ({ photo }) => Promise.resolve(photo.uri),
};
