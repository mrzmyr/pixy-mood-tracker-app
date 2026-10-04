import type * as TestingLibrary from "@testing-library/react-native";
import type * as FeatureFlags from "@/state/featureFlags";
import type * as Overrides from "@/state/featureFlags/overrides";

// The override gate reads the variant at module load. This file loads every
// module after setting it, so React and the flag module share one registry.
const ORIGINAL_VARIANT = process.env.EXPO_PUBLIC_APP_VARIANT;
process.env.EXPO_PUBLIC_APP_VARIANT = "preview";

// oxlint-disable-next-line typescript/no-require-imports -- loads after the variant is set above.
const testingLibrary: typeof TestingLibrary = require("@testing-library/react-native");
// oxlint-disable-next-line typescript/no-require-imports -- loads after the variant is set above.
const featureFlags: typeof FeatureFlags = require("@/state/featureFlags");
// oxlint-disable-next-line typescript/no-require-imports -- loads after the variant is set above.
const overrides: typeof Overrides = require("@/state/featureFlags/overrides");

const { act, renderHook } = testingLibrary;
const { useCanOverrideFeatureFlags, useFeatureFlag } = featureFlags;
const { setOverride } = overrides;

afterAll(() => {
  process.env.EXPO_PUBLIC_APP_VARIANT = ORIGINAL_VARIANT;
});

describe("feature flag overrides in preview builds", () => {
  test("override wins without consent and `remote` removes it", async () => {
    const hook = await renderHook(() => ({
      canOverride: useCanOverrideFeatureFlags(),
      isOn: useFeatureFlag("photos"),
    }));
    expect(hook.result.current).toEqual({ canOverride: true, isOn: false });

    await act(() => {
      setOverride({ key: "photos", value: "on" });
    });
    expect(hook.result.current.isOn).toBe(true);

    await act(() => {
      setOverride({ key: "photos", value: "off" });
    });
    expect(hook.result.current.isOn).toBe(false);

    await act(() => {
      setOverride({ key: "photos", value: "remote" });
    });
    expect(hook.result.current.isOn).toBe(false);
  });
});
