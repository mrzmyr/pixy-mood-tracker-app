# TestFlight release workflow

## Outcome

Merging a Release Please PR uploads the exact released commit to TestFlight. Normal pushes to `main` do not create builds.

EAS uses the `production` build and submission profiles. Build numbers are stored and incremented remotely, preventing duplicate App Store Connect uploads when a build must be retried.

Submission stops at TestFlight. Releasing the build publicly still requires manual promotion and App Review in App Store Connect.

## Prerequisites

- GitHub Actions secret `EXPO_TOKEN` authenticates an Expo account with access to EAS project `8917be91-f1cc-4276-a252-674a28490ac3`.
- EAS has valid Apple distribution credentials for team `8VVNC4724B` and bundle identifier `com.devmood.pixymoodtracker`.
- EAS Submit has a valid App Store Connect API key for app `1605327124`.
- Remote iOS build number is initialized above the highest build already uploaded to App Store Connect, and the remote Android version code is initialized from the current app config.
- Internal testers belong to an automatically distributed TestFlight group. External testers have completed Apple's required Beta App Review.

## Release

1. Merge product changes into `main` using Conventional Commit messages.
2. Review the Release Please PR version and changelog.
3. Merge the Release Please PR.
4. Release Please creates a GitHub release and reports `release_created=true`.
5. GitHub Actions checks out the released commit and starts an EAS production build.
6. EAS signs the app, increments its build number, and submits the successful build to TestFlight.
7. Verify tester distribution in App Store Connect.
8. After testing, manually promote that same build for App Review when ready.

## Verification criteria

### Before merging this workflow

- `eas.json` parses as JSON.
- Expo resolves bundle identifier `com.devmood.pixymoodtracker`, EAS project ID `8917be91-f1cc-4276-a252-674a28490ac3`, and App Store Connect app ID `1605327124`.
- Production profile uses remote versioning and automatic build-number increments.
- Remote versions are initialized for both iOS and Android.
- Test and type-check workflows pass.
- GitHub Actions secret `EXPO_TOKEN` exists.
- EAS iOS distribution and App Store Connect credentials are valid.

### Dry-path behavior

- A normal push to `main` runs Release Please.
- When no GitHub release is created, `testflight` is shown as skipped.
- No EAS build is created for that push.

### Release behavior

- Merging a Release Please PR creates one GitHub release and tag.
- `testflight` starts only after `release-please` succeeds.
- Workflow checks out the SHA reported by Release Please, matching the GitHub release tag.
- EAS creates one iOS build using the `production` profile.
- Build number is greater than the previous App Store Connect build number.
- Bundle identifier is `com.devmood.pixymoodtracker`.
- Successful build is uploaded to app `1605327124` and appears under TestFlight after Apple processing.
- Intended TestFlight users can install the build.
- Build is not submitted for public App Review automatically.

### Failure behavior

- Missing or invalid Expo authentication fails before a build starts.
- Missing, expired, or changed Apple build credentials fail the build because CI uses `--freeze-credentials`; CI never replaces build credentials silently.
- Missing or invalid App Store Connect credentials fail the submission after a successful build.
- Build or submission failure is visible from the EAS build/submission linked by GitHub Actions.
- Retry a failed submission without rebuilding: `eas submit --platform ios --profile production --id <BUILD_ID>`.
- Retry a failed build with GitHub's **Re-run failed jobs**, which preserves the Release Please outputs; **Re-run all jobs** skips TestFlight because the GitHub release already exists.
- If the original GitHub run is unavailable, retry from the released commit with `eas build --platform ios --profile production --auto-submit --non-interactive --freeze-credentials`.
- A retried build creates a new remote build number and does not collide with an earlier upload.

## Rollback

Disable or remove the `testflight` job from `.github/workflows/release-please.yml`. Existing TestFlight and App Store builds remain unchanged. No public release happens automatically.
