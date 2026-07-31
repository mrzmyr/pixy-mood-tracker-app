import { render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { SuperwallExpoModule } from 'expo-superwall';
import {
  ConfiguredSupportProvider,
  SUPPORT_PLACEMENT,
} from '../support/SuperwallSupportProvider';
import { SupportClient, useSupport } from '@/support';

const mockRegisterPlacement = jest.fn().mockResolvedValue(undefined);
const mockSetEventTrackingBehavior = jest.fn().mockResolvedValue(undefined);
let mockProviderProps: Record<string, unknown> | undefined;
const mockUseSuperwallEvents = jest.fn();

jest.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ isEnabled: false }),
}));

jest.mock('expo-superwall', () => ({
  SuperwallExpoModule: { consume: jest.fn().mockResolvedValue('consumed') },
  SuperwallProvider: (props: { children: React.ReactNode }) => {
    mockProviderProps = props;
    return props.children;
  },
  usePlacement: () => ({
    registerPlacement: mockRegisterPlacement,
    state: { status: 'idle' },
  }),
  useSuperwall: (selector: (state: object) => unknown) => selector({
    isConfigured: true,
    setEventTrackingBehavior: mockSetEventTrackingBehavior,
  }),
  useSuperwallEvents: (callbacks: object) => mockUseSuperwallEvents(callbacks),
}), { virtual: true });

describe('Superwall support provider', () => {
  const originalIosKey = process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY;
  const originalAndroidKey = process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY = 'test_ios_public_key';
    process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY = 'test_android_public_key';
    mockProviderProps = undefined;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY = originalIosKey;
    process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY = originalAndroidKey;
  });

  test('configures anonymous support with tracking disabled', async () => {
    let supportClient: SupportClient | undefined;
    const Probe = () => {
      supportClient = useSupport();
      return null;
    };

    render(
      <ConfiguredSupportProvider apiKeys={{
        android: 'test_android_public_key',
        ios: 'test_ios_public_key',
      }}>
        <Probe />
      </ConfiguredSupportProvider>,
    );

    expect(SUPPORT_PLACEMENT).toBe('support_pixy');
    await waitFor(() => expect(supportClient?.enabled).toBe(true));
    await waitFor(() => expect(mockProviderProps).toEqual(expect.objectContaining({
      apiKeys: {
        android: 'test_android_public_key',
        ios: 'test_ios_public_key',
      },
      options: expect.objectContaining({
        eventTrackingBehavior: 'none',
        shouldObservePurchases: false,
      }),
    })));
    await waitFor(() => expect(mockSetEventTrackingBehavior).toHaveBeenCalledWith('none'));

    await supportClient!.openSupport();

    expect(mockRegisterPlacement).toHaveBeenCalledWith({
      placement: SUPPORT_PLACEMENT,
    });
  });

  test('consumes Android contributions so every amount stays repeatable', async () => {
    const originalPlatform = Platform.OS;

    try {
      render(
        <ConfiguredSupportProvider apiKeys={{
          android: 'test_android_public_key',
          ios: 'test_ios_public_key',
        }}>
          <></>
        </ConfiguredSupportProvider>,
      );

      await waitFor(() => expect(mockUseSuperwallEvents).toHaveBeenCalled());
      const callbacks = mockUseSuperwallEvents.mock.calls[0]?.[0] as {
        onSuperwallEvent: (eventInfo: object) => void;
      };
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      callbacks.onSuperwallEvent({
        event: {
          event: 'transactionComplete',
          product: { productIdentifier: 'support_pixy_1' },
          transaction: { purchaseToken: 'test_purchase_token' },
        },
      });

      await waitFor(() => expect(SuperwallExpoModule.consume).toHaveBeenCalledWith(
        'test_purchase_token',
      ));
    } finally {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });
});
