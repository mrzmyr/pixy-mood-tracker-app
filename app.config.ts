import { ExpoConfig, ConfigContext } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const _config: ExpoConfig = { ...config };

  const PROFILE = process.env.PROFILE || 'development';
  const isDevClient = process.env.DEV_CLIENT === 'true';

  if (isDevClient) {
    _config.name = 'Pixy Dev';
    _config.ios!.bundleIdentifier = `com.devmood.pixymoodtracker.dev`
    _config.android!.package = `com.devmood.pixymoodtracker.dev`
    _config.android!.icon = _config.icon = './assets/images/icon-dev.png';
  }

  // Skipping SuperwallKit cuts a clean iOS build by ~10%. Store builds always link it;
  // local builds skip it unless PIXY_WITH_SUPERWALL=1.
  const isStoreBuild = ['preview', 'production'].includes(process.env.EAS_BUILD_PROFILE ?? '');
  const withSuperwall = isStoreBuild || process.env.PIXY_WITH_SUPERWALL === '1';

  if (!withSuperwall) {
    _config.plugins = [...(_config.plugins ?? []), './plugins/withoutSuperwall'];
  }

  // console.log('------------------------------');
  // console.log('Profile:', PROFILE);
  // console.log('Building with config:');
  // console.log(JSON.stringify(_config, null, 2));
  // console.log('------------------------------');

  return _config;
};
