import { requireOptionalNativeModule } from 'expo';
import { DisabledSupportProvider } from './DisabledSupportProvider';

// Store builds always link Superwall. Local builds link it only with PIXY_WITH_SUPERWALL=1.
const isSuperwallLinked = () => requireOptionalNativeModule('SuperwallExpo') !== null;

export function ConfiguredSupportProvider(
  props: React.ComponentProps<typeof DisabledSupportProvider>,
) {
  const Provider: typeof DisabledSupportProvider = isSuperwallLinked()
    ? require('./SuperwallSupportProvider').ConfiguredSupportProvider
    : DisabledSupportProvider;

  return <Provider {...props} />;
}
