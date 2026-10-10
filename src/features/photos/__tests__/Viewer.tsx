import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Colors from "@/constants/Colors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { PhotoViewer } from "../screens/Viewer";
import { getViewerItem } from "../viewerItem";
import type { PhotoViewerItem } from "../viewerItem";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const { capture: mockCapture } = getPostHogTestClient();

const photos: LogPhoto[] = [1, 2, 3].map((index) => ({
  id: `photo-${index}`,
  fileName: `photo-${index}.jpg`,
  width: 1200,
  height: 1600,
  createdAt: "2026-10-02T10:00:00.000Z",
  source: "library",
}));

const renderViewer = ({
  items,
  initialIndex,
  onRemove,
}: {
  items: PhotoViewerItem[];
  initialIndex?: number;
  onRemove?: (item: PhotoViewerItem) => void;
}) =>
  render(
    <GestureHandlerRootView>
      <ThemeProvider
        value={{
          ...DefaultTheme,
          dark: false,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <PhotoViewer
              items={items}
              initialIndex={initialIndex}
              context="logger"
              onClose={jest.fn()}
              onRemove={onRemove}
            />
          </AnalyticsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );

describe("PhotoViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("tracks the close with counts only, on every way out", async () => {
    await renderViewer({
      items: photos.map((photo) => getViewerItem({ photo })),
      initialIndex: 1,
    });
    expect(screen.getByText("2 / 3")).toBeTruthy();

    await screen.unmount();

    const closed = jest
      .mocked(mockCapture)
      .mock.calls.filter(([event]) => event === "photos:viewer_closed");
    expect(closed).toEqual([
      [
        "photos:viewer_closed",
        expect.objectContaining({
          context: "logger",
          photos_count: 3,
          viewed_count: 1,
        }),
      ],
    ]);
  });

  test("stored entries: view only, no Remove button", async () => {
    await renderViewer({
      items: photos.map((photo) => getViewerItem({ photo })),
    });

    expect(screen.queryByText("Remove")).toBeNull();
  });

  test("Remove removes the current page", async () => {
    const onRemove = jest.fn();
    const items = photos.map((photo) => getViewerItem({ photo }));
    await renderViewer({ items, initialIndex: 1, onRemove });

    await fireEvent.press(screen.getByText("Remove"));

    expect(onRemove).toHaveBeenCalledWith(items[1]);
  });
});
