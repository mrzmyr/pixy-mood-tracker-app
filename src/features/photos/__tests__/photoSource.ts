import dayjs from "dayjs";
import * as ExpoMediaLibrary from "expo-media-library";
import { DAY_PHOTOS_LIMIT, getDayBounds, getPhotoSource } from "../photoSource";

// Helpers of the manual mock in src/__mocks__/expo-media-library.js.
const { __setAssets, __setPermission, __reset } =
  // SAFETY: Jest resolves this import to the manual mock, which adds the helpers.
  ExpoMediaLibrary as typeof ExpoMediaLibrary & {
    __setAssets: (
      assets: { id: string; creationTime: number; mediaType?: string }[]
    ) => void;
    __setPermission: (response: {
      status: "granted" | "undetermined" | "denied";
      granted?: boolean;
      canAskAgain?: boolean;
      accessPrivileges?: "all" | "limited" | "none";
    }) => void;
    __reset: () => void;
  };

const at = (localTime: string) => dayjs(localTime).valueOf();

describe("system photo source", () => {
  beforeEach(() => {
    __reset();
    jest.clearAllMocks();
  });

  test("day bounds cover the local day: start inclusive, end exclusive", () => {
    expect(getDayBounds({ date: "2026-10-02" })).toEqual({
      start: at("2026-10-02T00:00:00.000"),
      end: at("2026-10-03T00:00:00.000"),
    });
  });

  test("lists images of the local day only, newest first", async () => {
    __setAssets([
      { id: "day-before", creationTime: at("2026-10-01T23:59:59.999") },
      { id: "midnight", creationTime: at("2026-10-02T00:00:00.000") },
      { id: "noon", creationTime: at("2026-10-02T12:00:00.000") },
      { id: "last-ms", creationTime: at("2026-10-02T23:59:59.999") },
      { id: "day-after", creationTime: at("2026-10-03T00:00:00.000") },
      {
        id: "video",
        creationTime: at("2026-10-02T13:00:00.000"),
        mediaType: "video",
      },
    ]);

    const photos = await getPhotoSource().listPhotosOnDate({
      date: "2026-10-02",
    });

    expect(photos).toEqual([
      { id: "last-ms", uri: "last-ms" },
      { id: "noon", uri: "noon" },
      { id: "midnight", uri: "midnight" },
    ]);
  });

  test(`lists at most ${DAY_PHOTOS_LIMIT} photos, the newest ones`, async () => {
    __setAssets(
      Array.from({ length: DAY_PHOTOS_LIMIT + 5 }, (_, minute) => ({
        id: `photo-${minute}`,
        creationTime: at("2026-10-02T08:00:00.000") + minute * 60_000,
      }))
    );

    const photos = await getPhotoSource().listPhotosOnDate({
      date: "2026-10-02",
    });

    expect(photos).toHaveLength(DAY_PHOTOS_LIMIT);
    expect(photos[0].id).toBe(`photo-${DAY_PHOTOS_LIMIT + 4}`);
  });

  test("resolves a library photo to a file URI for import", async () => {
    await expect(
      getPhotoSource().getLibraryPhotoUri({
        photo: { id: "abc", uri: "ph://abc" },
      })
    ).resolves.toBe("file:///library/abc.jpg");
  });

  test("reads permission without asking and asks for photos only", async () => {
    __setPermission({
      status: "granted",
      granted: true,
      accessPrivileges: "limited",
    });

    await expect(getPhotoSource().getLibraryPermission()).resolves.toBe(
      "limited"
    );
    expect(ExpoMediaLibrary.requestPermissionsAsync).not.toHaveBeenCalled();

    await getPhotoSource().requestLibraryPermission();
    expect(ExpoMediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(
      false,
      ["photo"]
    );
  });

  test.each([
    [{ status: "granted", granted: true, accessPrivileges: "all" }, "granted"],
    [{ status: "undetermined", canAskAgain: true }, "undetermined"],
    // Android after one refusal: the dialog still shows.
    [{ status: "denied", canAskAgain: true }, "undetermined"],
    [{ status: "denied", canAskAgain: false }, "denied"],
  ] as const)("maps permission %o to %s", async (response, expected) => {
    __setPermission(response);

    await expect(getPhotoSource().getLibraryPermission()).resolves.toBe(
      expected
    );
  });
});
