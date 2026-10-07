import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet, Text } from "react-native";

import { SheetModal } from "../SheetModal";

const STATUS_BAR_HEIGHT = 42;

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 42, right: 0, bottom: 24, left: 0 }),
}));

const renderSheet = async (os: "ios" | "android", onClose = jest.fn()) => {
  jest.replaceProperty(Platform, "OS", os);
  await render(
    <SheetModal visible onClose={onClose} backgroundColor="white">
      <Text testID="sheet-header">Header</Text>
    </SheetModal>
  );
  const header = screen.getByTestId("sheet-header");
  return StyleSheet.flatten(header.parent?.props.style).paddingTop;
};

describe("SheetModal", () => {
  it("starts the content below the status bar on Android", async () => {
    expect(await renderSheet("android")).toBe(STATUS_BAR_HEIGHT);
  });

  it("leaves the iOS page sheet layout alone", async () => {
    expect(await renderSheet("ios")).toBe(0);
  });

  it("closes on Android back", async () => {
    const onClose = jest.fn();
    await renderSheet("android", onClose);
    // The modal host is the nearest ancestor that takes the back event.
    let modal = screen.getByTestId("sheet-header");
    while (modal.parent && !modal.props.onRequestClose) {
      modal = modal.parent;
    }
    fireEvent(modal, "requestClose");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
