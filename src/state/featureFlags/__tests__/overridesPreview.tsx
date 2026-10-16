import { Text } from "react-native";
import type * as FlagHighlightModule from "@/components/FlagHighlight";
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
// oxlint-disable-next-line typescript/no-require-imports -- loads after the variant is set above.
const flagHighlightModule: typeof FlagHighlightModule = require("@/components/FlagHighlight");

const { act, render, renderHook } = testingLibrary;
const { useCanOverrideFeatureFlags, useFeatureFlag } = featureFlags;
const { setHighlight, setOverride } = overrides;
const FlagHighlight = flagHighlightModule.default;

const renderHighlight = () =>
  render(
    <FlagHighlight flag="photos">
      <Text>flagged</Text>
    </FlagHighlight>
  );

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

  test("FlagHighlight never hides children, whatever the flag", async () => {
    const screen = await renderHighlight();
    expect(screen.getByText("flagged")).toBeTruthy();

    await act(() => {
      setOverride({ key: "photos", value: "off" });
      setHighlight(true);
    });
    expect(screen.getByText("flagged")).toBeTruthy();

    await act(() => {
      setHighlight(false);
      setOverride({ key: "photos", value: "remote" });
    });
  });

  test("highlight outlines UI with its flag key only while on", async () => {
    const screen = await renderHighlight();
    expect(screen.queryByTestId("feature-flag-highlight-photos")).toBeNull();

    await act(() => {
      setHighlight(true);
    });
    expect(screen.getByTestId("feature-flag-highlight-photos")).toBeTruthy();
    expect(screen.getByText("photos")).toBeTruthy();

    await act(() => {
      setHighlight(false);
    });
    expect(screen.queryByTestId("feature-flag-highlight-photos")).toBeNull();
    expect(screen.getByText("flagged")).toBeTruthy();
  });
});
