import { renderHook } from "@testing-library/react-native";
import { createElement } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useScrollBottomPadding } from "../useScrollBottomPadding";

const initialMetrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SafeAreaProvider, { initialMetrics }, children);

describe("useScrollBottomPadding()", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("leaves the home indicator inset to iOS", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    const hook = await renderHook(() => useScrollBottomPadding(20), {
      wrapper,
    });
    expect(hook.result.current).toBe(20);
  });

  it("adds the gesture bar inset on Android", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const hook = await renderHook(() => useScrollBottomPadding(20), {
      wrapper,
    });
    expect(hook.result.current).toBe(54);
  });
});
