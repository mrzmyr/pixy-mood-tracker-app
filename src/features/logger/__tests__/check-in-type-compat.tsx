import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { act, render, renderHook, screen } from "@testing-library/react-native";
import { _generateItem } from "@/testing/log-item";
import Colors from "@/constants/colors";
import { INITIAL_STATE } from "@/constants/settings";
import { decodeBackup, encodeBackup } from "@/features/datagate";
import { getJSONSchemaType } from "@/features/datagate/import";
import Providers from "@/shell/providers";
import { STORAGE_KEY } from "@/state/settings";
import type { LogItem } from "@/features/logs";
import { LogDraftProvider, useLogDraft } from "../log-draft";
import { Logger } from "../logger";

let mockOnFlags: string[] = [];

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature flags come from PostHog after consent; these tests turn check-in-types on and off by name
jest.mock("@/state/feature-flags", () => ({
  ...jest.requireActual("@/state/feature-flags"),
  useFeatureFlag: (flag: string) => mockOnFlags.includes(flag),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-superwall is a native module imported transitively by Providers
jest.mock(
  "expo-superwall",
  () => ({
    SuperwallExpoModule: { consume: jest.fn() },
    SuperwallProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    usePlacement: () => ({
      registerPlacement: jest.fn(),
      state: { status: "idle" },
    }),
    useSuperwall: <T,>(
      selector: (state: {
        isConfigured: boolean;
        setEventTrackingBehavior: jest.Mock;
      }) => T
    ) =>
      selector({
        isConfigured: false,
        setEventTrackingBehavior: jest.fn(),
      }),
    useSuperwallEvents: jest.fn(),
  }),
  { virtual: true }
);

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the carousel renders no slides until native layout reports a size, which Jest never does
jest.mock("react-native-reanimated-carousel", () => ({
  Carousel: ({
    data,
    renderItem,
    defaultIndex = 0,
  }: {
    data: unknown[];
    renderItem: (info: { index: number }) => React.ReactNode;
    defaultIndex?: number;
  }) => data[defaultIndex] && renderItem({ index: defaultIndex }),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the iOS header writes to the native bar, which needs a navigator; this suite renders the logger without one, so it uses the in-screen bar
jest.mock("@/components/route-modal-header", () =>
  jest.requireActual("@/components/route-modal-header.android")
);

// oxlint-disable-next-line anti-slop/no-module-mocking -- the discard guard needs a navigator (covered in useDiscardGuard tests); this suite renders the logger without one
jest.mock("@/hooks/use-discard-guard", () => ({
  __esModule: true,
  useDiscardGuard: () => ({ allowLeave: jest.fn() }),
}));

const morning = _generateItem({
  date: "2026-11-04",
  dateTime: "2026-11-04T07:30:00.000Z",
  checkInType: "morning_intention",
});
// Entry from before check-in types: no key at all.
const legacy = _generateItem({ date: "2026-11-03" });

const encode = (items: LogItem[]) =>
  encodeBackup(
    {
      items,
      tags: [],
      tagCategories: [],
      people: [],
      settings: INITIAL_STATE,
    },
    "1.95.2"
  );

const renderMorningLogger = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Providers
        supportClient={{
          enabled: false,
          openSupport: () => Promise.resolve(),
        }}
      >
        <Logger mode="edit" avaliableSteps={["rating"]} initialItem={morning} />
      </Providers>
    </ThemeProvider>
  );

describe("check-in type stays compatible", () => {
  test("export and import keep the type and add none to older entries", () => {
    const result = decodeBackup(encode([morning, legacy]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.items[0].checkInType).toBe("morning_intention");
      expect(result.backup.items[1]).not.toHaveProperty("checkInType");
    }
  });

  test("import accepts a type this version does not know", () => {
    const backup = JSON.parse(encode([morning]));
    // A newer app version may store other type values.
    backup.items[0].checkInType = "afternoon_pause";

    expect(getJSONSchemaType(backup)).toBe("pixy");
  });

  test("editing a typed entry keeps its type", async () => {
    const hook = await renderHook(() => useLogDraft(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <LogDraftProvider initialDraft={morning}>{children}</LogDraftProvider>
      ),
    });
    let saved: LogItem | undefined;
    await act(() => {
      hook.result.current.setRating("bad");
      saved = hook.result.current.commit([morning]).item;
    });

    expect(saved?.checkInType).toBe("morning_intention");
  });
});

describe("check-in type prompts follow flag check-in-types", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...INITIAL_STATE,
        actionsDone: [
          { title: "onboarding", date: "2026-10-03T00:00:00.000Z" },
        ],
      })
    );
  });

  test("flag on: a morning entry asks about the morning", async () => {
    mockOnFlags = ["check-in-types"];
    await renderMorningLogger();

    expect(
      await screen.findByText("How do you feel this morning?")
    ).toBeOnTheScreen();
  });

  test("flag off: a morning entry opens like any entry", async () => {
    mockOnFlags = [];
    await renderMorningLogger();

    expect(await screen.findByText("How was your day?")).toBeOnTheScreen();
    expect(screen.queryByText("How do you feel this morning?")).toBeNull();
  });
});
