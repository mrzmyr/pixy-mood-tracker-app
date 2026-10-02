import { Asset } from "expo-asset";
import noop from "lodash/noop";
import type { LibraryPermission, PhotoSource } from "@/features/photos";
import { createStructuredError } from "@/lib/errors";

// Generated with ffmpeg's `gradients` source, 1200x1600. Required only from
// `src/dev`, so production bundles never contain them.
const PICKER_SAMPLES = [
  require("../../assets/images/dev/sample-photo-1.jpg"),
  require("../../assets/images/dev/sample-photo-2.jpg"),
  require("../../assets/images/dev/sample-photo-3.jpg"),
];
const DAY_SAMPLES = [
  require("../../assets/images/dev/sample-day-photo-1.jpg"),
  require("../../assets/images/dev/sample-day-photo-2.jpg"),
  require("../../assets/images/dev/sample-day-photo-3.jpg"),
  require("../../assets/images/dev/sample-day-photo-4.jpg"),
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

// Library access starts `undetermined`, like a fresh install, so the
// permission row and its Allow flow show. Allow grants it until restart.
let permission: LibraryPermission = "undetermined";
let nextPickerSample = 0;

/**
 * Stands in for the library picker, camera, and photo library in preview
 * builds: returns bundled sample photos without system screens or
 * permission dialogs. Each picker open returns the next of 3 samples, the
 * camera always the first one, and every day holds 4 other samples.
 */
export const fakePhotoSource: PhotoSource = {
  pickFromLibrary: async ({ limit }) => {
    if (limit <= 0) {
      return [];
    }
    const sample = PICKER_SAMPLES[nextPickerSample % PICKER_SAMPLES.length];
    nextPickerSample += 1;
    return [await loadSample(sample)];
  },
  takePhoto: () => loadSample(PICKER_SAMPLES[0]),
  getLibraryPermission: () => Promise.resolve(permission),
  requestLibraryPermission: () => {
    permission = "granted";
    return Promise.resolve(permission);
  },
  manageLibraryAccess: () => Promise.resolve(),
  // The samples never change.
  addLibraryListener: () => noop,
  listPhotosOnDate: async () => {
    const samples = await Promise.all(DAY_SAMPLES.map(loadSample));
    return samples.map(({ uri }, index) => ({
      id: `sample-day-photo-${index + 1}`,
      uri,
    }));
  },
  // Sample files sit in the cache already, so the preview URI imports as is.
  getLibraryPhotoUri: ({ photo }) => Promise.resolve(photo.uri),
};
