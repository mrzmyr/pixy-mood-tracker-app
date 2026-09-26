import { render, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { SuperwallExpoModule } from "expo-superwall";
import { resolveSuperwallEnabled } from "@/constants/Services";
import {
  ConfiguredSupportProvider,
  SUPPORT_PLACEMENT,
} from "../support/SuperwallSupportProvider";
import type { SupportClient } from "@/support";
import { useSupport } from "@/support";

interface MockSuperwallState {
  isConfigured: boolean;
  setEventTrackingBehavior: jest.Mock;
}

interface MockSuperwallEventInfo {
  event: {
    event: string;
    product: { productIdentifier: string };
    transaction: { purchaseToken: string };
  };
}

interface MockSuperwallEventCallbacks {
  onSuperwallEvent: (eventInfo: MockSuperwallEventInfo) => void;
}

const mockRegisterPlacement = jest.fn(() => Promise.resolve());
const mockSetEventTrackingBehavior = jest.fn(() => Promise.resolve());
let mockProviderProps: { children: React.ReactNode } | undefined;
const mockUseSuperwallEvents = jest.fn<
  undefined,
  [MockSuperwallEventCallbacks]
>();

// oxlint-disable-next-line anti-slop/no-module-mocking -- ConfiguredSupportProvider reads analytics consent from useAnalytics; the real hook needs Settings and PostHog providers that would make this test async on storage loading
jest.mock("@/state/analytics", () => ({
  useAnalytics: () => ({ isEnabled: false }),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-superwall is a native SDK unavailable in Jest; this test drives its callbacks directly
jest.mock(
  "expo-superwall",
  () => ({
    SuperwallExpoModule: { consume: jest.fn().mockResolvedValue("consumed") },
    SuperwallProvider: (props: { children: React.ReactNode }) => {
      mockProviderProps = props;
      return props.children;
    },
    usePlacement: () => ({
      registerPlacement: mockRegisterPlacement,
      state: { status: "idle" },
    }),
    useSuperwall: <T,>(selector: (state: MockSuperwallState) => T) =>
      selector({
        isConfigured: true,
        setEventTrackingBehavior: mockSetEventTrackingBehavior,
      }),
    useSuperwallEvents: (callbacks: MockSuperwallEventCallbacks) =>
      mockUseSuperwallEvents(callbacks),
  }),
  { virtual: true }
);

const Probe = ({ onClient }: { onClient: (client: SupportClient) => void }) => {
  onClient(useSupport());
  return null;
};

describe("Superwall support provider", () => {
  const originalIosKey = process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY;
  const originalAndroidKey = process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY = "test_ios_public_key";
    process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY =
      "test_android_public_key";
    mockProviderProps = undefined;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY = originalIosKey;
    process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY = originalAndroidKey;
  });

  test("configures anonymous support with tracking disabled", async () => {
    let supportClient: SupportClient | undefined;

    render(
      <ConfiguredSupportProvider
        apiKeys={{
          android: "test_android_public_key",
          ios: "test_ios_public_key",
        }}
      >
        <Probe
          onClient={(client) => {
            supportClient = client;
          }}
        />
      </ConfiguredSupportProvider>
    );

    expect(SUPPORT_PLACEMENT).toBe("support_pixy");
    await waitFor(() => expect(supportClient?.enabled).toBe(true));
    await waitFor(() =>
      expect(mockProviderProps).toEqual(
        expect.objectContaining({
          apiKeys: {
            android: "test_android_public_key",
            ios: "test_ios_public_key",
          },
          options: expect.objectContaining({
            eventTrackingBehavior: "none",
            shouldObservePurchases: false,
          }),
        })
      )
    );
    await waitFor(() =>
      expect(mockSetEventTrackingBehavior).toHaveBeenCalledWith("none")
    );

    await supportClient?.openSupport();

    expect(mockRegisterPlacement).toHaveBeenCalledWith({
      placement: SUPPORT_PLACEMENT,
    });
  });

  test("consumes Android contributions so every amount stays repeatable", async () => {
    const originalPlatform = Platform.OS;

    try {
      render(
        <ConfiguredSupportProvider
          apiKeys={{
            android: "test_android_public_key",
            ios: "test_ios_public_key",
          }}
        >
          {null}
        </ConfiguredSupportProvider>
      );

      await waitFor(() => expect(mockUseSuperwallEvents).toHaveBeenCalled());
      const callbacks = mockUseSuperwallEvents.mock.calls[0]?.[0];
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: "android",
      });
      callbacks?.onSuperwallEvent({
        event: {
          event: "transactionComplete",
          product: { productIdentifier: "support_pixy_1" },
          transaction: { purchaseToken: "test_purchase_token" },
        },
      });

      await waitFor(() =>
        expect(SuperwallExpoModule.consume).toHaveBeenCalledWith(
          "test_purchase_token"
        )
      );
    } finally {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  test("never configures Superwall when the flag is off", async () => {
    let supportClient: SupportClient | undefined;

    render(
      <ConfiguredSupportProvider
        apiKeys={{
          android: "test_android_public_key",
          ios: "test_ios_public_key",
        }}
        isEnabled={false}
      >
        <Probe
          onClient={(client) => {
            supportClient = client;
          }}
        />
      </ConfiguredSupportProvider>
    );

    await waitFor(() => expect(supportClient?.enabled).toBe(false));
    expect(mockProviderProps).toBeUndefined();
    expect(mockUseSuperwallEvents).not.toHaveBeenCalled();

    await supportClient?.openSupport();

    expect(mockRegisterPlacement).not.toHaveBeenCalled();
  });
});

describe("Superwall flag", () => {
  test("stays on by default so production keeps today's behavior", () => {
    expect(resolveSuperwallEnabled({ value: undefined })).toBe(true);
    expect(resolveSuperwallEnabled({ value: "" })).toBe(true);
    expect(resolveSuperwallEnabled({ value: "true" })).toBe(true);
  });

  test("turns off with false or with service mocks", () => {
    expect(resolveSuperwallEnabled({ value: "false" })).toBe(false);
    expect(
      resolveSuperwallEnabled({ isServiceMocks: true, value: undefined })
    ).toBe(false);
  });
});
