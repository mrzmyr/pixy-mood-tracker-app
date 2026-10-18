import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider, router } from "expo-router";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { _generateItem } from "@/testing/logItem";
import Colors from "@/constants/Colors";
import { LogsProvider } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettingsLoad } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { Entry } from "../screens/LogList/Entry";

let mockIsPhotosEnabled = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the photos flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: (flag: string) => flag === "photos" && mockIsPhotosEnabled,
}));

const photo: LogPhoto = {
  id: "photo-1",
  fileName: "photo-1.jpg",
  width: 1200,
  height: 1600,
  createdAt: "2026-10-02T10:00:00.000Z",
  source: "day",
  libraryId: "library-1",
};

const { capture: mockCapture } = getPostHogTestClient();

/** Galeria `onIndexChange` event for the page at `currentIndex`. */
const page = (currentIndex: number) => ({ nativeEvent: { currentIndex } });

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSettingsLoad();
  return status === "ready" ? children : null;
};

const renderEntry = ({ photos }: { photos: LogPhoto[] }) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: true }}>
          <LogsProvider>
            <TagsProvider>
              <PeopleProvider>
                <Loaded>
                  <Entry
                    item={_generateItem({ photos })}
                    onEdit={jest.fn()}
                    onDelete={jest.fn()}
                  />
                </Loaded>
              </PeopleProvider>
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

describe("day view photos section", () => {
  afterEach(() => {
    mockIsPhotosEnabled = true;
  });

  test("flag on, no photos: add pill, no photo row", async () => {
    await renderEntry({ photos: [] });

    await waitFor(() => {
      expect(screen.getByLabelText("Add Photos")).toBeTruthy();
    });
    expect(screen.getByTestId("log-list-photos-edit")).toBeTruthy();
    expect(screen.queryByTestId("log-list-photos")).toBeNull();
    expect(screen.queryByTestId("photo-add-tile")).toBeNull();
  });

  test("flag on, with photos: thumbnails and edit tile", async () => {
    await renderEntry({ photos: [photo] });

    await waitFor(() => {
      expect(screen.getByLabelText("Photo 1 of 1")).toBeTruthy();
    });
    expect(screen.getByLabelText("Edit Photos")).toBeTruthy();
    expect(screen.queryByLabelText("Add Photos")).toBeNull();
  });

  test("flag off, with photos: stored photos stay, no pencil", async () => {
    mockIsPhotosEnabled = false;
    await renderEntry({ photos: [photo] });

    await waitFor(() => {
      expect(screen.getByLabelText("Photo 1 of 1")).toBeTruthy();
    });
    expect(screen.queryByTestId("log-list-photos-edit")).toBeNull();
  });

  test("flag off, no photos: no photo row, no add pill", async () => {
    mockIsPhotosEnabled = false;
    await renderEntry({ photos: [] });

    await waitFor(() => {
      expect(screen.getByLabelText("Add Tags")).toBeTruthy();
    });
    expect(screen.queryByTestId("log-list-photos")).toBeNull();
    expect(screen.queryByTestId("log-list-photos-edit")).toBeNull();
  });

  test("flag on, native viewer: close tracks distinct photos viewed", async () => {
    const photos = [1, 2, 3].map((index) => ({
      ...photo,
      id: `photo-${index}`,
      fileName: `photo-${index}.jpg`,
    }));
    await renderEntry({ photos });
    await waitFor(() => {
      expect(screen.getByTestId("galeria-image-1")).toBeTruthy();
    });
    jest.mocked(mockCapture).mockClear();

    // Opened from the second tile: pages to the third, back to the second.
    const tile = screen.getByTestId("galeria-image-1");
    await fireEvent(tile, "indexChange", page(2));
    await fireEvent(tile, "indexChange", page(1));
    await fireEvent(tile, "dismiss");
    // Opened again from the first tile, closed without paging.
    await fireEvent(screen.getByTestId("galeria-image-0"), "dismiss");

    const closed = jest
      .mocked(mockCapture)
      .mock.calls.filter(([event]) => event === "photos:viewer_closed");
    expect(closed).toEqual([
      [
        "photos:viewer_closed",
        expect.objectContaining({
          context: "day",
          photos_count: 3,
          viewed_count: 2,
        }),
      ],
      [
        "photos:viewer_closed",
        expect.objectContaining({
          context: "day",
          photos_count: 3,
          viewed_count: 1,
        }),
      ],
    ]);
  });

  test("flag on, native viewer: screen reader opens the route viewer", async () => {
    const push = jest.spyOn(router, "push").mockImplementation(() => {});
    const photos = [1, 2, 3].map((index) => ({
      ...photo,
      id: `photo-${index}`,
      fileName: `photo-${index}.jpg`,
    }));
    await renderEntry({ photos });

    await waitFor(() => {
      expect(screen.getByLabelText("Photo 2 of 3")).toBeTruthy();
    });
    await fireEvent(
      screen.getByLabelText("Photo 2 of 3"),
      "accessibilityAction",
      {
        nativeEvent: { actionName: "activate" },
      }
    );

    expect(push).toHaveBeenCalledWith({
      pathname: "/photos/[id]",
      params: expect.objectContaining({ index: "1" }),
    });
    push.mockRestore();
  });

  test("flag off: no native viewer, tiles open the route viewer", async () => {
    mockIsPhotosEnabled = false;
    await renderEntry({ photos: [photo] });

    await waitFor(() => {
      expect(screen.getByLabelText("Photo 1 of 1")).toBeTruthy();
    });
    expect(screen.queryByTestId("galeria-image-0")).toBeNull();
  });
});
