import type { ExpoConfig, ConfigContext } from "@expo/config";

const appConfig = ({ config }: ConfigContext): ExpoConfig => {
  const _config: ExpoConfig = { ...config };

  const isDevClient = process.env.DEV_CLIENT === "true";

  if (isDevClient) {
    _config.name = "Pixy Dev";
    _config.icon = "./assets/images/icon-dev.png";
    _config.ios = {
      ...config.ios,
      bundleIdentifier: `com.devmood.pixymoodtracker.dev`,
    };
    _config.android = {
      ...config.android,
      package: `com.devmood.pixymoodtracker.dev`,
      icon: _config.icon,
    };
  }

  // console.log('------------------------------');
  // console.log('Profile:', process.env.PROFILE || 'development');
  // console.log('Building with config:');
  // console.log(JSON.stringify(_config, null, 2));
  // console.log('------------------------------');

  return _config;
};

export default appConfig;
