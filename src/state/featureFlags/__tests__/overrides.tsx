import type * as TestingLibrary from "@testing-library/react-native";
import type * as FeatureFlags from "@/state/featureFlags";
import type * as Overrides from "@/state/featureFlags/overrides";
import type * as DevOverrides from "@/dev/featureFlagOverrides";

// The override gate reads the variant at module load. This file loads every
// module after setting it, so React and the flag module share one registry.
const ORIGINAL_VARIANT = process.env.EXPO_PUBLIC_APP_VARIANT;
process.env.EXPO_PUBLIC_APP_VARIANT = "preview";

// oxlint-disable-next-line typescript/no-require-imports -- loads after the variant is set above.
const testingLibrary: typeof TestingLibrary = require("@testing-library/react-native");
// oxlint-disable-next-line typescript/no-require-imports -- loads after the variant is set above.
const featureFlags: typeof FeatureFlags = require("@/state/featureFlags");
// oxlint-disable-next-line typescript/no-require-imports -- loads after the variant is set above.
const devOverrides: typeof DevOverrides = require("@/dev/featureFlagOverrides");

const { act, renderHook } = testingLibrary;
const { useFeatureFlag } = featureFlags;
const { setOverride } = devOverrides;

const loadGate = (variant?: string) => {
  const { env } = process;
  process.env = { ...env, EXPO_PUBLIC_APP_VARIANT: variant };
  let gate: typeof Overrides.DEV_OVERRIDES | undefined;
  jest.isolateModules(() => {
    // oxlint-disable-next-line typescript/no-require-imports -- the gate reads the variant at module load; each case needs a fresh module.
    gate = require("@/state/featureFlags/overrides").DEV_OVERRIDES;
  });
  process.env = env;
  return gate;
};

afterAll(() => {
  process.env.EXPO_PUBLIC_APP_VARIANT = ORIGINAL_VARIANT;
});

describe("feature flag overrides", () => {
  test("development and preview builds load the override store", () => {
    expect(loadGate("development")).not.toBeNull();
    expect(loadGate("preview")).not.toBeNull();
  });

  test("production builds never load the override store", () => {
    expect(loadGate("production")).toBeNull();
    expect(loadGate()).toBeNull();
  });

  test("override wins without consent and `remote` removes it", async () => {
    const hook = await renderHook(() => useFeatureFlag("photos"));
    expect(hook.result.current).toBe(false);

    await act(() => {
      setOverride({ key: "photos", value: "on" });
    });
    expect(hook.result.current).toBe(true);

    await act(() => {
      setOverride({ key: "photos", value: "off" });
    });
    expect(hook.result.current).toBe(false);

    await act(() => {
      setOverride({ key: "photos", value: "remote" });
    });
    expect(hook.result.current).toBe(false);
  });
});
