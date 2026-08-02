import { NavigationContainer } from '@react-navigation/native';
import {
  act,
  render,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import Providers from '@/components/Providers';
import Colors from '@/constants/Colors';
import {
  createFakeSupportClient,
  resolveDevelopmentSupportClient,
  SupportClient,
} from '@/support';
import { SettingsScreen } from '@/screens/Settings';

jest.mock('lucide-react-native', () => ({
  Tag: () => null,
}));

jest.mock('expo-superwall', () => ({
  SuperwallExpoModule: { consume: jest.fn() },
  SuperwallProvider: ({ children }: { children: React.ReactNode }) => children,
  usePlacement: () => ({ registerPlacement: jest.fn(), state: { status: 'idle' } }),
  useSuperwall: (selector: (state: object) => unknown) => selector({
    isConfigured: false,
    setEventTrackingBehavior: jest.fn(),
  }),
  useSuperwallEvents: jest.fn(),
}), { virtual: true });

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const navigation = {
  navigate: jest.fn(),
};

const renderSettings = (supportClient: SupportClient) => render(
  <NavigationContainer
    theme={{
      dark: false,
      colors: Colors.light,
    } as never}
  >
    <Providers supportClient={supportClient}>
      <SettingsScreen
        navigation={navigation as never}
        route={{ key: 'settings', name: 'Settings' }}
      />
    </Providers>
  </NavigationContainer>,
);

const collectTestIds = (node: any): string[] => {
  if (Array.isArray(node)) return node.flatMap(collectTestIds);
  if (!node || typeof node !== 'object') return [];

  const testId = node.props?.testID;
  return [
    ...(typeof testId === 'string' ? [testId] : []),
    ...collectTestIds(node.children),
  ];
};

describe('Support Pixy in Settings', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('user sees no support card when support is disabled', async () => {
    const openSupport = jest.fn().mockResolvedValue(undefined);
    const screen = await renderSettings({ enabled: false, openSupport });

    expect(screen.queryByTestId('support-pixy-card')).toBeNull();
    expect(openSupport).not.toHaveBeenCalled();

    const testIds = collectTestIds(screen.toJSON());
    expect(testIds.indexOf('settings-version')).toBeLessThan(
      testIds.indexOf('settings-development-user-data'),
    );
  });

  test('user sees approved support card in a configured development build', async () => {
    const supportClient = resolveDevelopmentSupportClient({
      isDevelopment: true,
      mode: 'available',
    });

    expect(supportClient).toBeDefined();

    const screen = await renderSettings(supportClient!);

    expect(screen.getByTestId('support-pixy-card')).toBeOnTheScreen();
    expect(screen.getByText('Has Pixy supported your wellbeing?')).toBeOnTheScreen();
    expect(screen.getByText(
      'Pixy is free to use and supported by optional contributions. If it has been useful to you, you may support its continued development.',
    )).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Support Pixy' })).toBeOnTheScreen();

    const testIds = collectTestIds(screen.toJSON());
    expect(testIds.indexOf('settings-development-user-data')).toBeLessThan(
      testIds.indexOf('support-pixy-card'),
    );
    expect(testIds.indexOf('support-pixy-card')).toBeLessThan(
      testIds.indexOf('settings-version'),
    );
  });

  test('user opens support flow from the card', async () => {
    const supportClient = createFakeSupportClient();
    const screen = await renderSettings(supportClient);

    await userEvent.press(screen.getByRole('button', { name: 'Support Pixy' }));

    await waitFor(() => expect(supportClient.attempts).toBe(1));
  });

  test('contribution creates no local supporter state', async () => {
    const showAlert = jest.spyOn(Alert, 'alert').mockImplementation();
    const supportClient = createFakeSupportClient();
    const screen = await renderSettings(supportClient);
    const button = screen.getByRole('button', { name: 'Support Pixy' });

    await userEvent.press(button);
    await userEvent.press(button);

    await waitFor(() => expect(supportClient.attempts).toBe(2));
    expect(showAlert).not.toHaveBeenCalled();
    expect(button).toBeEnabled();
    expect(screen.queryByTestId('support-pixy-thanks')).toBeNull();
  });

  test('user can retry a failed support flow', async () => {
    const supportClient = createFakeSupportClient('failed', 'available');
    let retry: (() => void) | undefined;
    const showAlert = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _message, buttons) => {
        retry = buttons?.find((button) => button.text === 'Retry')?.onPress;
      },
    );
    const screen = await renderSettings(supportClient);

    await userEvent.press(screen.getByRole('button', { name: 'Support Pixy' }));

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'Support unavailable',
      'Try again. Pixy remains fully usable.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: expect.any(Function) },
      ],
    ));
    expect(screen.getByRole('button', { name: 'Data' })).toBeEnabled();

    await act(async () => retry?.());

    await waitFor(() => expect(supportClient.attempts).toBe(2));
  });

  test('user cannot open duplicate support flows while one is loading', async () => {
    let finishSupport: () => void = () => undefined;
    const openSupport = jest.fn(() => new Promise<void>((resolve) => {
      finishSupport = resolve;
    }));
    const screen = await renderSettings({ enabled: true, openSupport });
    const button = screen.getByRole('button', { name: 'Support Pixy' });

    await userEvent.press(button);
    await userEvent.press(button);

    expect(openSupport).toHaveBeenCalledTimes(1);

    finishSupport();
    await waitFor(() => expect(button).toBeEnabled());
  });
});
