import { NavigationContainer } from '@react-navigation/native';
import { act, render, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Providers from '@/components/Providers';
import Colors from '@/constants/Colors';
import {
  createFakeSupportClient,
  resolveSupportClient,
  SupportClient,
} from '@/support';
import { SettingsScreen } from '@/screens/Settings';

jest.mock('lucide-react-native', () => ({
  Tag: () => null,
}));

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

describe('Support Pixy in Settings', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('user sees no support card when support is disabled', async () => {
    const openSupport = jest.fn().mockResolvedValue('cancelled');
    const screen = await renderSettings({ enabled: false, openSupport });

    expect(screen.queryByTestId('support-pixy-card')).toBeNull();
    expect(openSupport).not.toHaveBeenCalled();
  });

  test('user sees approved support card in a configured development build', async () => {
    const supportClient = resolveSupportClient({
      isDevelopment: true,
      fakeOutcome: 'cancelled',
    });

    const screen = await renderSettings(supportClient);

    expect(screen.getByTestId('support-pixy-card')).toBeOnTheScreen();
    expect(screen.getByText('Has Pixy supported your wellbeing?')).toBeOnTheScreen();
    expect(screen.getByText(
      'Pixy is free to use and supported by optional contributions. If it has been useful to you, you may support its continued development.',
    )).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Support Pixy' })).toBeOnTheScreen();
  });

  test('user opens support flow from the card', async () => {
    const supportClient = createFakeSupportClient('cancelled');
    const screen = await renderSettings(supportClient);

    await userEvent.press(screen.getByRole('button', { name: 'Support Pixy' }));

    await waitFor(() => expect(supportClient.attempts).toBe(1));
  });

  test('supporter receives thanks after a successful contribution', async () => {
    const showAlert = jest.spyOn(Alert, 'alert').mockImplementation();
    const supportClient = createFakeSupportClient('purchased');
    const screen = await renderSettings(supportClient);
    const button = screen.getByRole('button', { name: 'Support Pixy' });

    await userEvent.press(button);

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
      'Thank you for supporting Pixy',
      'Your contribution helps keep Pixy maintained, free, and open source.',
    ));
    expect(supportClient.attempts).toBe(1);
    await waitFor(() => expect(button).toBeEnabled());
  });

  test('user can cancel support without follow-up pressure', async () => {
    const showAlert = jest.spyOn(Alert, 'alert').mockImplementation();
    const supportClient = createFakeSupportClient('cancelled');
    const screen = await renderSettings(supportClient);
    const button = screen.getByRole('button', { name: 'Support Pixy' });

    await userEvent.press(button);

    await waitFor(() => expect(supportClient.attempts).toBe(1));
    expect(showAlert).not.toHaveBeenCalled();
    expect(button).toBeEnabled();
  });

  test('user can retry a failed support flow', async () => {
    const supportClient = createFakeSupportClient('failed', 'cancelled');
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
    let finishSupport: (outcome: 'cancelled') => void = () => undefined;
    const openSupport = jest.fn(() => new Promise<'cancelled'>((resolve) => {
      finishSupport = resolve;
    }));
    const screen = await renderSettings({ enabled: true, openSupport });
    const button = screen.getByRole('button', { name: 'Support Pixy' });

    await userEvent.press(button);
    await userEvent.press(button);

    expect(openSupport).toHaveBeenCalledTimes(1);

    await act(async () => finishSupport('cancelled'));
  });
});
