module.exports = {
  bumpFiles: [
    {
      filename: 'package.json',
    },
    {
      filename: 'app.json',
      updater: require.resolve('standard-version-expo'),
    },
    {
      filename: 'app.json',
      updater: require.resolve('standard-version-expo/android'),
    },
    {
      filename: 'app.json',
      updater: require.resolve('standard-version-expo/ios'),
    },
  ],
  types: [
    {type: "feat", section: "Features"},
    {type: "fix", section: "Bug Fixes"},
    {type: "docs", section: "Documentation"},
    {type: "style", section: "Styling"},
    {type: "refactor", section: "Refactors"},
    {type: "perf", section: "Performance"},
    {type: "test", section: "Tests"},
    {type: "build", section: "Build System"},
    {type: "ci", section: "CI"},
    {type: "chore", section: "Chore"},
    {type: "revert", section: "Reverts"}
  ]
};
