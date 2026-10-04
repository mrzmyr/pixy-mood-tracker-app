# Store release workflow

## Outcome

- Merging a Release Please PR builds the exact released commit for both platforms
  - iOS: TestFlight
  - Android: Google Play internal testing track
- Normal pushes to `main` do not create builds

EAS uses the `production` build and submission profiles. Build numbers and version codes are stored and incremented remotely, preventing duplicate store uploads when a build must be retried.

Submission stops at TestFlight and the Play internal track. Public release still requires manual promotion in App Store Connect and Play Console.

## Prerequisites

- GitHub Actions secret `EXPO_TOKEN` authenticates an Expo account with access to EAS project `8917be91-f1cc-4276-a252-674a28490ac3`.
- EAS has valid Apple distribution credentials for team `8VVNC4724B` and bundle identifier `com.devmood.pixymoodtracker`.
- EAS Submit has a valid App Store Connect API key for app `1605327124`.
- EAS has the Android upload keystore for `com.devmood.pixymoodtracker`.
- EAS Submit has a Google Play service account key with release permission for `com.devmood.pixymoodtracker`. Upload it with `eas credentials --platform android`. Never commit the key file.
- Remote iOS build number is initialized above the highest build already uploaded to App Store Connect, and the remote Android version code is initialized from the current app config.
- Internal testers belong to an automatically distributed TestFlight group. External testers have completed Apple's required Beta App Review.

## Export compliance

`app.json` declares that Pixy uses no non-exempt encryption. Do not ask again unless the app or a dependency adds non-exempt cryptography.

## Release

1. Merge product changes into `main` using Conventional Commit messages.
2. Review the Release Please PR version and changelog.
3. Merge the Release Please PR.
4. Release Please creates a GitHub release and reports `release_created=true`.
5. GitHub Actions checks out the released commit and starts one EAS production build per platform.
6. GitHub Actions exits after EAS accepts the build; EAS continues remotely, signs the app, increments its build number, and submits the successful build to TestFlight or the Play internal track.
7. Verify tester distribution in App Store Connect and Play Console.
8. After testing, manually promote that same build to production in each store.

## Force a version

- Release Please picks the next version from commit types. Override it with a `Release-As` footer.
- Squash merge the PR with `gh pr merge <PR> --squash --body "Release-As: 1.90.0"`. Repository squash message setting is `BLANK`, so the footer must come from `--body`.
- Release Please updates the open Release Please PR to the forced version.
- Use this when a version string already has a TestFlight build that never shipped from `main`. Example: build `1.89.0 (100)` came from `fix/release-1.89.0`.

## Verification criteria

### Before merging this workflow

- `eas.json` parses as JSON.
- Expo resolves bundle identifier `com.devmood.pixymoodtracker`, EAS project ID `8917be91-f1cc-4276-a252-674a28490ac3`, and App Store Connect app ID `1605327124`.
- Expo resolves `ios.infoPlist.ITSAppUsesNonExemptEncryption` to `false`.
- Production profile uses remote versioning and automatic build-number increments.
- Remote versions are initialized for both iOS and Android.
- Test and type-check workflows pass.
- GitHub Actions secret `EXPO_TOKEN` exists.
- EAS iOS distribution and App Store Connect credentials are valid.

### Dry-path behavior

- A normal push to `main` runs Release Please.
- When no GitHub release is created, `store-release` is shown as skipped.
- No EAS build is created for that push.

### Release behavior

- Merging a Release Please PR creates one GitHub release and tag.
- `store-release` starts only after `release-please` succeeds.
- Workflow checks out the SHA reported by Release Please, matching the GitHub release tag.
- EAS creates one iOS and one Android build using the `production` profile.
- Build number is greater than the previous App Store Connect build number.
- Bundle identifier is `com.devmood.pixymoodtracker`.
- Successful build is uploaded to app `1605327124` and appears under TestFlight after Apple processing.
- Build reaches `READY_FOR_BETA_TESTING` without a missing export-compliance state.
- Intended TestFlight users can install the build.
- Android build appears on the Play internal track with status `completed`.
- Neither build is released publicly automatically.

### Failure behavior

- Missing or invalid Expo authentication fails before a build starts.
- Missing, expired, or changed Apple build credentials fail the build because CI uses `--freeze-credentials`; CI never replaces build credentials silently.
- Missing or invalid App Store Connect or Google Play credentials fail the submission after a successful build.
- One platform failing does not cancel the other (`fail-fast: false`).
- Build or submission failure is visible from the EAS build/submission linked by GitHub Actions.
- Retry a failed submission without rebuilding: `eas submit --platform <ios|android> --profile production --id <BUILD_ID>`.
- Retry a failed build with GitHub's **Re-run failed jobs**, which preserves the Release Please outputs; **Re-run all jobs** skips store builds because the GitHub release already exists.
- If the original GitHub run is unavailable, retry from the released commit with `eas build --platform <ios|android> --profile production --auto-submit --non-interactive --freeze-credentials`.
- A retried build creates a new remote build number and does not collide with an earlier upload.

## Rollback

Remove a platform from the `store-release` matrix in `.github/workflows/release-please.yml`, or remove the job. Existing store builds remain unchanged. No public release happens automatically.
