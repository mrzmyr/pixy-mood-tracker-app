import { ExpoConfig, ConfigContext } from '@expo/config';
import pkg from './package.json';

const CONFIG = {
  "name": "Pixy",
  "slug": "pixy-mood-tracker",
  "version": "",
  "orientation": "portrait",
  "icon": "./assets/images/icon.png",
  "scheme": "pixy",
  "userInterfaceStyle": "automatic",
  "splash": {
    "image": "./assets/images/splash.png",
    "resizeMode": "contain",
    "backgroundColor": "#ffffff",
    "dark": {
      "image": "./assets/images/splash.png",
      "backgroundColor": "#171717"
    }
  },
  "updates": {
    "fallbackToCacheTimeout": 0,
    "url": "https://u.expo.dev/8917be91-f1cc-4276-a252-674a28490ac3"
  },
  "assetBundlePatterns": [
    "**/*"
  ],
  "ios": {
    "bundleIdentifier": "com.devmood.pixymoodtracker",
    "buildNumber": "",
    "supportsTablet": false,
    "appStoreUrl": "https://apps.apple.com/de/app/pixy-mood-tracker/id1605327124",
    "infoPlist": {
      "NSFaceIDUsageDescription": "Pixy uses Face ID to lock the app and protect your data."
    },
    "splash": {
      "dark": {
        "image": "./assets/images/splash.png",
        "backgroundColor": "#171717"
      }
    }
  },
  "android": {
    "package": "com.devmood.pixymoodtracker",
    "versionCode": 0,
    "allowBackup": false,
    "permissions": [],
    "icon": "./assets/images/icon.png",
    "adaptiveIcon": {
      "foregroundImage": "./assets/images/adaptive-icon.png",
      "backgroundColor": "#ffffff"
    },
    "splash": {
      "dark": {
        "image": "./assets/images/splash.png",
        "backgroundColor": "#171717"
      }
    },
    "playStoreUrl": "https://play.google.com/store/apps/details?id=com.devmood.pixymoodtracker"
  },
  "plugins": [
    [
      "onesignal-expo-plugin",
      {
        mode: "development",
      }
    ],
    "sentry-expo",
    "expo-notifications",
    [
      "expo-document-picker",
      {
        "appleTeamId": "8VVNC4724B"
      }
    ],
  ],
  "runtimeVersion": {
    "policy": "sdkVersion"
  },
  "extra": {
    "eas": {
      "projectId": "8917be91-f1cc-4276-a252-674a28490ac3"
    }
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const _config = { ...CONFIG };
  
  const isDevClient = process.env.DEV_CLIENT === 'true';
  
  if(isDevClient) {
    _config.name = 'Pixy Dev';
    _config.ios.bundleIdentifier = `${_config.ios.bundleIdentifier}.dev`
    _config.android.package = `${_config.android.package}.dev`
    _config.android.icon = _config.icon = './assets/images/icon-dev.png';
  }

  _config.version = pkg.version;
  _config.ios.buildNumber = pkg.version;
  _config.android.versionCode = parseInt('4400' + pkg.version.split('.').join(''));

  return _config;
};