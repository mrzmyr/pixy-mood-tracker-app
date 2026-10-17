import * as Sentry from "@sentry/react-native";
import { requireOptionalNativeModule } from "expo";
import { Directory, File, Paths } from "expo-file-system";
import { createStructuredError } from "@/lib/errors";

/**
 * Close enough to show the neighborhood around the pin. Same scale as the
 * `expo-maps` camera zoom.
 */
export const SNAPSHOT_ZOOM = 13;

/**
 * Decimal places kept from a coordinate: 4 is about 11 m, under one point
 * on a tile at {@link SNAPSHOT_ZOOM}. Nearby entries share one image.
 */
const COORDINATE_DECIMALS = 4;

const DIRECTORY_NAME = "map-snapshots";

/**
 * Part of every cache file name. Bump it when the native image changes, for
 * example a new map style, so tiles never show an old file.
 */
const SNAPSHOT_VERSION = 1;

/** Input of the native `MapSnapshot.createAsync` (`modules/map-snapshot`). */
interface SnapshotOptions {
  latitude: number;
  longitude: number;
  zoom: number;
  /** Image size in points. */
  width: number;
  height: number;
  /** Pixels per point. */
  scale: number;
  isDark: boolean;
  /** `file://` URI of the PNG to write. */
  uri: string;
}

interface MapSnapshotModule {
  createAsync: (options: SnapshotOptions) => Promise<void>;
}

/** One still map image of a place, as a tile shows it. */
export interface SnapshotRequest {
  latitude: number;
  longitude: number;
  /** Tile size in points. */
  width: number;
  height: number;
  /** Pixels per point. */
  scale: number;
  colorScheme: "light" | "dark";
}

/**
 * Snapshot state per file name for this session: a `file://` URI when the
 * image exists, `null` when it failed. Failed places show the placeholder
 * until the next app start, so a scroll never retries in a loop.
 */
const results = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

const getCause = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const roundCoordinate = (value: number) => value.toFixed(COORDINATE_DECIMALS);

/**
 * Two polynomial string hashes, about 60 bits together. File names carry no
 * coordinates, so a native error that quotes a path never reports where the
 * user was.
 */
const hash = (value: string) => {
  let first = 0;
  let second = 0;
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    first = (first * 131 + code) % 1_000_000_007;
    second = (second * 137 + code) % 998_244_353;
  }
  return `${first.toString(36)}-${second.toString(36)}`;
};

/**
 * Cache file name of a snapshot. Depends on everything the image shows:
 * version, rounded place, zoom, color scheme, and pixel size. A new zoom, scheme, or
 * tile size gets its own file, never a stale one.
 */
export const getSnapshotFileName = ({
  latitude,
  longitude,
  width,
  height,
  scale,
  colorScheme,
}: SnapshotRequest) =>
  `${hash(
    [
      SNAPSHOT_VERSION,
      roundCoordinate(latitude),
      roundCoordinate(longitude),
      SNAPSHOT_ZOOM,
      colorScheme,
      Math.round(width),
      Math.round(height),
      scale,
    ].join("_")
  )}.png`;

/**
 * Directory of snapshot images: `<cache>/map-snapshots/`. iOS may clear it
 * under storage pressure; tiles then render the images again.
 */
const getSnapshotsDirectory = () => new Directory(Paths.cache, DIRECTORY_NAME);

/**
 * Snapshot of a place, without native work.
 *
 * @returns The `file://` URI when the image exists, `null` when it failed
 *   this session, `undefined` when {@link loadSnapshot} must render it.
 */
export const getSnapshot = (
  request: SnapshotRequest
): string | null | undefined => {
  const fileName = getSnapshotFileName(request);
  if (results.has(fileName)) {
    return results.get(fileName);
  }
  // Rendering now: skip the synchronous file check on every render.
  if (pending.has(fileName)) {
    return;
  }
  const file = new File(getSnapshotsDirectory(), fileName);
  if (file.exists) {
    results.set(fileName, file.uri);
    return file.uri;
  }
};

const renderSnapshot = async (request: SnapshotRequest) => {
  const nativeModule =
    requireOptionalNativeModule<MapSnapshotModule>("MapSnapshot");
  if (nativeModule === null) {
    throw createStructuredError({
      status: "map_snapshot_unavailable",
      message: "Map snapshot could not be created",
      why: "The MapSnapshot native module is not in this build",
      fix: "Build the iOS app again, so it links modules/map-snapshot",
    });
  }
  const directory = getSnapshotsDirectory();
  const file = new File(directory, getSnapshotFileName(request));
  try {
    directory.create({ idempotent: true, intermediates: true });
    await nativeModule.createAsync({
      latitude: Number(roundCoordinate(request.latitude)),
      longitude: Number(roundCoordinate(request.longitude)),
      zoom: SNAPSHOT_ZOOM,
      width: Math.round(request.width),
      height: Math.round(request.height),
      scale: request.scale,
      isDark: request.colorScheme === "dark",
      uri: file.uri,
    });
  } catch (error) {
    throw createStructuredError({
      status: "map_snapshot_failed",
      message: "Map snapshot could not be created",
      why: getCause(error),
      fix: "Check the network connection and free storage, then restart Pixy. Tiles show a pin until then",
    });
  }
  return file.uri;
};

const renderOrReport = async (request: SnapshotRequest, fileName: string) => {
  let uri: string | null = null;
  try {
    uri = await renderSnapshot(request);
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
  }
  results.set(fileName, uri);
  pending.delete(fileName);
  return uri;
};

/**
 * Renders a place snapshot with Apple Maps (`modules/map-snapshot`) and
 * caches it on disk. Tiles of the same place share one native call.
 *
 * Never rejects. A failure is reported once and resolves `null`; the tile
 * keeps its placeholder.
 */
export const loadSnapshot = (request: SnapshotRequest) => {
  const fileName = getSnapshotFileName(request);
  const known = getSnapshot(request);
  if (known !== undefined) {
    return Promise.resolve(known);
  }
  const running = pending.get(fileName);
  if (running !== undefined) {
    return running;
  }
  const promise = renderOrReport(request, fileName);
  pending.set(fileName, promise);
  return promise;
};
