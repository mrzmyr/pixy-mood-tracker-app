const { withPodfile, withSettingsGradle } = require('expo/config-plugins');

const SUPERWALL_PACKAGE = 'expo-superwall';

const createPatchError = (file, pattern) => Object.assign(
  new Error(`Superwall could not be excluded from ${file}`),
  {
    status: 'superwall_exclude_patch_failed',
    why: `${file} no longer contains \`${pattern}\`, so autolinking cannot be patched.`,
    fix: `Update plugins/withoutSuperwall.js to match the generated ${file}, or build with PIXY_WITH_SUPERWALL=1.`,
  },
);

const replaceOnce = (contents, file, pattern, replacement) => {
  if (!pattern.test(contents)) {
    throw createPatchError(file, pattern.source);
  }
  return contents.replace(pattern, replacement);
};

// Removes the expo-superwall native module (and SuperwallKit) from autolinking.
module.exports = function withoutSuperwall(config) {
  config = withPodfile(config, (podfileConfig) => {
    podfileConfig.modResults.contents = replaceOnce(
      podfileConfig.modResults.contents,
      'Podfile',
      /^(\s*)use_expo_modules!\s*$/m,
      `$1use_expo_modules!(exclude: ['${SUPERWALL_PACKAGE}'])`,
    );
    return podfileConfig;
  });

  config = withSettingsGradle(config, (settingsConfig) => {
    settingsConfig.modResults.contents = replaceOnce(
      settingsConfig.modResults.contents,
      'settings.gradle',
      /^expoAutolinking\.useExpoModules\(\)$/m,
      `expoAutolinking.exclude = ['${SUPERWALL_PACKAGE}']\nexpoAutolinking.useExpoModules()`,
    );
    return settingsConfig;
  });

  return config;
};
