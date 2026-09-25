import type { ExpoConfig, ConfigContext } from "@expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const _config: ExpoConfig = { ...config };

  const PROFILE = process.env.PROFILE || "development";
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
  // console.log('Profile:', PROFILE);
  // console.log('Building with config:');
  // console.log(JSON.stringify(_config, null, 2));
  // console.log('------------------------------');

  return _config;
};
