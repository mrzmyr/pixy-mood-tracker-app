import { render, screen } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { PhotoViewer } from "../screens/Viewer";

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

describe("PhotoViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("tracks the close with counts only, on every way out", async () => {
    await render(
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: true }}>
          <PhotoViewer
            photos={photos}
            initialIndex={1}
            context="day"
            onClose={jest.fn()}
          />
        </AnalyticsProvider>
      </SettingsProvider>
    );
    expect(screen.getByText("2 / 3")).toBeTruthy();

    await screen.unmount();

    const closed = jest
      .mocked(mockCapture)
      .mock.calls.filter(([event]) => event === "photos:viewer_closed");
    expect(closed).toEqual([
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
});
