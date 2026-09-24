import { render } from '@testing-library/react-native';
import { requireOptionalNativeModule } from 'expo';
import { disabledSupportClient, SupportClient, useSupport } from '@/support';
import { ConfiguredSupportProvider } from '../support/ConfiguredSupportProvider.native';

const mockSuperwallClient: SupportClient = {
  enabled: true,
  openSupport: jest.fn(),
};

jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(),
}));

jest.mock('../support/SuperwallSupportProvider', () => {
  const { SupportProvider } = jest.requireActual('@/support');
  return {
    ConfiguredSupportProvider: ({ children }: { children: React.ReactNode }) => (
      <SupportProvider client={mockSuperwallClient}>{children}</SupportProvider>
    ),
  };
});

const renderSupportClient = async () => {
  let supportClient: SupportClient | undefined;
  const Probe = () => {
    supportClient = useSupport();
    return null;
  };

  await render(
    <ConfiguredSupportProvider>
      <Probe />
    </ConfiguredSupportProvider>,
  );

  return supportClient;
};

describe('Configured support provider (native)', () => {
  test('uses Superwall when its native module is linked', async () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue({});

    expect(await renderSupportClient()).toBe(mockSuperwallClient);
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('SuperwallExpo');
  });

  test('disables support when Superwall is not linked', async () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null);

    expect(await renderSupportClient()).toBe(disabledSupportClient);
  });
});
