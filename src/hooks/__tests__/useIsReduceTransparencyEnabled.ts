import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo, DeviceEventEmitter } from "react-native";
import { useIsReduceTransparencyEnabled } from "../useIsReduceTransparencyEnabled";

const EVENT = "reduceTransparencyChanged";

const mockSetting = (isEnabled: boolean) => {
  jest
    .spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
    .mockResolvedValue(isEnabled);
  // Route the iOS setting event through a real emitter the test controls.
  jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation((_type, listener) =>
      DeviceEventEmitter.addListener(EVENT, listener)
    );
};

describe("useIsReduceTransparencyEnabled()", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    DeviceEventEmitter.removeAllListeners(EVENT);
  });

  it("reports the setting when it is on at launch", async () => {
    mockSetting(true);
    const hook = await renderHook(() => useIsReduceTransparencyEnabled());
    await act(async () => {});

    expect(hook.result.current).toBe(true);
  });

  it("follows the setting when the user changes it", async () => {
    mockSetting(false);
    const hook = await renderHook(() => useIsReduceTransparencyEnabled());
    await act(async () => {});
    expect(hook.result.current).toBe(false);

    await act(() => DeviceEventEmitter.emit(EVENT, true));
    expect(hook.result.current).toBe(true);

    await act(() => DeviceEventEmitter.emit(EVENT, false));
    expect(hook.result.current).toBe(false);
  });

  it("stops listening on unmount", async () => {
    mockSetting(false);
    const hook = await renderHook(() => useIsReduceTransparencyEnabled());
    await act(async () => {});
    expect(DeviceEventEmitter.listenerCount(EVENT)).toBeGreaterThan(0);

    await act(() => hook.unmount());
    expect(DeviceEventEmitter.listenerCount(EVENT)).toBe(0);
  });
});
