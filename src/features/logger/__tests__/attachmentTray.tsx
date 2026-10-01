import { fireEvent, render } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import type { LogPhoto } from "@/types";
import {
  TRAY_BOTTOM_OFFSET,
  TRAY_HEIGHT,
  getSlidePaddingBottom,
  isTrayVisible,
} from "../attachmentTray";
import { AttachmentTray } from "../components/AttachmentTray";

const createPhoto = (index: number): LogPhoto => ({
  id: `photo-${index}`,
  fileName: `photo-${index}.jpg`,
  width: 1200,
  height: 1600,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const PHOTOS = [createPhoto(1), createPhoto(2), createPhoto(3)];

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider
    value={{
      ...DefaultTheme,
      colors: { ...DefaultTheme.colors, ...Colors.light },
    }}
  >
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 59, left: 0, right: 0, bottom: 34 },
      }}
    >
      {children}
    </SafeAreaProvider>
  </ThemeProvider>
);

describe("attachment tray visibility", () => {
  test("hides without photos, also on the rating slide before a rating", () => {
    expect(isTrayVisible({ photosCount: 0 })).toBe(false);
    expect(getSlidePaddingBottom({ photosCount: 0 })).toBe(0);
  });

  test("shows with photos on every slide, also before a rating", () => {
    expect(isTrayVisible({ photosCount: 1 })).toBe(true);
    expect(isTrayVisible({ photosCount: 6 })).toBe(true);
  });

  test("pads slides so the tray never covers slide content", () => {
    const padding = getSlidePaddingBottom({ photosCount: 3 });

    expect(padding).toBeGreaterThanOrEqual(TRAY_HEIGHT);
    expect(padding).toBeGreaterThan(TRAY_BOTTOM_OFFSET);
  });
});

describe("<AttachmentTray>", () => {
  test("renders nothing without photos", async () => {
    const { queryByTestId } = await render(
      <AttachmentTray photos={[]} onRemove={jest.fn()} />,
      { wrapper }
    );

    expect(queryByTestId("logger-attachment-tray")).toBeNull();
  });

  test("shows thumbnails and the count", async () => {
    const { getByTestId, getByLabelText } = await render(
      <AttachmentTray photos={PHOTOS} onRemove={jest.fn()} />,
      { wrapper }
    );

    expect(getByTestId("logger-attachment-count")).toHaveTextContent("3 of 6");
    expect(getByLabelText("Photo 2 of 3")).toBeTruthy();
    expect(getByLabelText("Remove photo 3")).toBeTruthy();
  });

  test("removes a photo with one tap", async () => {
    const onRemove = jest.fn();
    const { getByLabelText } = await render(
      <AttachmentTray photos={PHOTOS} onRemove={onRemove} />,
      { wrapper }
    );

    await fireEvent.press(getByLabelText("Remove photo 2"));

    expect(onRemove).toHaveBeenCalledWith(PHOTOS[1]);
  });

  test("opens the draft viewer from a thumbnail", async () => {
    const { getByLabelText, queryByTestId } = await render(
      <AttachmentTray photos={PHOTOS} onRemove={jest.fn()} />,
      { wrapper }
    );

    expect(queryByTestId("photo-viewer")).toBeNull();
    await fireEvent.press(getByLabelText("Photo 1 of 3"));

    expect(queryByTestId("photo-viewer")).not.toBeNull();
  });
});
