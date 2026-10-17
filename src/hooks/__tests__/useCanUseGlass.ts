import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo, DeviceEventEmitter } from "react-native";
import { useCanUseGlass } from "../useCanUseGlass";

// oxlint-disable-next-line anti-slop/no-module-mocking -- native OS capability check; jest has no iOS 26 runtime
jest.mock("expo-glass-effect", () => ({
  __esModule: true,
  isLiquidGlassAvailable: jest.fn(() => true),
  isGlassEffectAPIAvailable: jest.fn(() => true),
}));

const mockReduceTransparency = (isEnabled: boolean) => {
  jest
    .spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
    .mockResolvedValue(isEnabled);
  jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation((_type, listener) =>
      DeviceEventEmitter.addListener("reduceTransparencyChanged", listener)
    );
};

const renderUseCanUseGlass = async () => {
  const hook = await renderHook(() => useCanUseGlass());
  await act(async () => {});
  return hook;
};

describe("useCanUseGlass()", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    DeviceEventEmitter.removeAllListeners("reduceTransparencyChanged");
  });

  it("uses glass when both guards pass and Reduce Transparency is off", async () => {
    mockReduceTransparency(false);
    const hook = await renderUseCanUseGlass();

    expect(hook.result.current).toBe(true);
  });

  it("falls back to a solid surface when Reduce Transparency is on", async () => {
    mockReduceTransparency(true);
    const hook = await renderUseCanUseGlass();

    expect(hook.result.current).toBe(false);
  });
});
