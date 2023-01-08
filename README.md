<br />
<p align="center">
  <a href="https://github.com/mrzmyr/pixy-mood-tracker">
    <img src="./docs/icon.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Pixy Mood Tracker</h3>

  <p align="center">Minimalistic app to track your mood within one pixel a day.</p>
  <p align="center">
    <a href="https://apps.apple.com/de/app/pixy-mood-tracker/id1605327124">Apple App Store</a>
    ·
    <a href="https://play.google.com/store/apps/details?id=com.devmood.pixymoodtracker">Google Play Store</a>
  </p>
</p>

## About The Project

<p align="center">
  <img src="./docs/screen-1.png" width="400px">
</p>

### Built With

This section should list any major frameworks that you built your project using. Leave any add-ons/plugins for the acknowledgements section. Here are a few examples.

* [React Native](https://reactnative.dev/)
* [Expo](https://expo.dev/)

## Development

**Setup**

1. Clone the repo
```shell
$ git clone https://github.com/mrzmyr/pixy-mood-tracker.git
```
2. Install dependencies
```shell
$ yarn
```
3. Start local server
```shell
$ yarn start
```

**Environments** (`eas.json`)

- `development` Builds for local development on phisical devices
- `emulator`: Builds for local development in iOS Simulator or Android Emulator 
- `preview`: Builds used for Testflight and Android Internal Testing
- `production`: Builds used for production

## Building

| Environment | OS | Channel | `yarn` command | Extension | Installation |
| ----------- | -- | ------- | -------------- | --------- | ------------ |
| `development` | iOS | Physical Device | `build:ios:dev` | `.ipa` |  Install `.ipa` file via [Apple Configurator](https://apps.apple.com/us/app/apple-configurator/id1037126344?mt=12) |
| `development` | Android | Physical Device | `build:android:dev` | `.apk` |  Install manually (enable "Install from unknown sources") |
| `emulator` | iOS | Simulator | `build:ios:emulator` | `.ipa` |  Install `.ipa` file via  |
| `emulator` | Android | Emulator | `build:android:emulator` |  `.apk` |  Install the `.apk` file via drag and drop |
| `preview` | iOS | TestFlight | `build:ios:preview` | `.ipa` |  Submit `.ipa` file to App Store via `yarn submit:ios:preview` |
| `preview` | Android | Goolge Play Console | `build:android:preview` | `.aab` |  Submit `.aab` file to Google Play Console via `yarn submit:android:preview` |
| `production` | iOS | Physical Device | `build:ios:prod` | `.ipa` |  Submit `.ipa` file via `yarn submit:ios:production` |
| `production` | Android | Physical Device | `build:android:prod` | `.aab` |  Submit `.aab` file via `yarn submit:android:production` |

## Releasing

### Preview

1. (If native changes) `yarn publish:preview` (iOS and Android builds are built and submited for testing)
2. Merge a PR to `preview` branch (automatically publishing a release to all betatesters)

### Production

1. (If native changes) `yarn publish:production` (iOS and Android builds are built and submited for testing)
2. (If native changes) Submit App to Review in Google Play Console
3. (If native changes) Submit App to Review in App Store Connect
4. Merge a PR to `production` branch (automatically publishing a release to all users)

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat-add-feature`)
3. Commit your Changes (`git commit -m 'feat: my feature'`)
4. Push to the Branch (`git push origin feat-add-feature`)
5. Open a Pull Request

## Contact

mrzmyr [@mrzmyr](https://twitter.com/mrzmyr)

Project Link: [https://github.com/mrzmyr/pixy-mood-tracker](https://github.com/mrzmyr/pixy-mood-tracker)

### Supported Languages

| Name | Key |
|---|---|
| Arabic | ar |
| Chinese (Simplified) | zh |
| Croatian | hr |
| Czech | cs |
| Danish | da |
| Dutch | nl |
| English | en |
| Finnish | fi |
| French | fr |
| German | de |
| Greek | el |
| Hebrew | he |
| Hindi | hi |
| Hungarian | hu |
| Indonesian | id |
| Italian | it |
| Japanese | ja |
| Korean | ko |
| Malay | ms |
| Norwegian | no |
| Polish | pl |
| Portuguese | pt |
| Romanian | ro |
| Russian | ru |
| Slovak | sk |
| Spanish | es |
| Swedish | sv |
| Thai | th |
| Turkish | tr |
| Ukrainian | uk |
| Vietnamese | vi |
