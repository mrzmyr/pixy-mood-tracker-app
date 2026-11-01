# Backup

Pixy has no server. Data leaves the phone only through the cloud backup or a manual export.

## Cloud backup

- One PostHog feature flag per cloud ([`useBackupProviders`](../src/features/backup/providers.ts)):
  - `backup-ios-icloud`: iCloud on iOS
  - `backup-ios-google-drive`: Google Drive on iOS. Also needs an iOS OAuth client ([Google](#google-drive))
  - `backup-android-google-drive`: Google Drive on Android
- No cloud flag on for this platform: no Settings > Data > Backup row, Backup deep link redirects to Settings > Data
- Flag of the chosen cloud off: no read or write there, even when `backupProvider` names it
- One cloud at a time. `settings.backupProvider` names it (`icloud`, `googledrive`, `null` = off). While one is on, the other switch is disabled. Switch cloud = turn off (deletes the copy), then turn the other on
- One file `pixy-mood-tracker-backup.json` in the hidden app folder of iCloud or Google Drive
- Library: [`react-native-cloud-storage`](https://cloudstorage.kuatsu.de/), `AppData` scope, one storage instance per cloud
- Code: [`src/features/backup/`](../src/features/backup/). One module per cloud: [`icloud.ts`](../src/features/backup/icloud.ts), [`google-drive.ts`](../src/features/backup/google-drive.ts)
- Screen: Settings > Data > Backup ([`screens/backup.tsx`](../src/features/backup/screens/backup.tsx)). One switch per offered cloud
- File = normal export ([`encodeBackup`](../src/features/datagate/backup.ts)) plus `deviceId` and `createdAt`. "Last sync" shows `createdAt`
- Writes 3 seconds after the last change of entries, tags, people, or exported settings
- Restore uses the import flow. It replaces local data after a confirmation
- "Restore from Backup…" shows only while auto-backup is paused: no local entries, or a bigger backup from another phone. Restore can never discard newer local changes

### Rules

- Never write a backup with 0 entries
- Never write before the logs store loaded. Before that the entry count is 0 and "Restore" would show for a moment
- Never replace a cloud file this version cannot parse (newer `pixyBackup`, unknown export field, damaged JSON). Status `incompatible`, backup pauses until the app updates
- Restore waits for the import to finish before this phone claims the backup. Until then the next write would replace the backup with the old local data
- Offline failures (`backup_offline` in [`failure.ts`](../src/features/backup/failure.ts)) pause backup with status `unavailable`. Other failures reach Sentry once per failure code and session
- Replace another phone's backup only when this phone has at least as many entries ([`canReplaceBackup`](../src/features/backup/backup-file.ts)). A fresh install must not wipe the backup before the user restores
- Never replace another phone's backup that is newer than this phone's last write (`settings.backupWrittenAt`). Backup pauses here, "Restore from Backup…" shows with a note. Two phones in use never clobber each other
- Read the cloud file again right before every write and on every return to the app. Another phone may have written since
- Restore keeps this phone's onboarding action. Analytics consent is a device setting: exports never carry it, imports keep it
- Restore confirmation names both entry counts and the backup age
- Photos are not in the backup (metadata only, like the export). Copy says so
- Switch off deletes the cloud file after a confirmation. Google Drive also signs out of Google
- Switch off always turns backup off on this phone. Delete failed (offline, no Drive access, sign-in cancelled): alert names the steps to delete the copy in iCloud or Google Drive
- Google consent screen leaves the Drive checkbox unticked. Sign-in without Drive access asks once more (`addScopes`), then signs out and keeps the switch off. Silent sign-in without Drive access counts as signed out
- `settings.backupProvider` and `settings.backupWrittenAt` are device settings: not exported, kept on import. `backupProvider` defaults to `null` on both platforms. User turns a cloud on in Settings > Data > Backup
- Backup needs a feature flag, so it needs analytics consent ([`FeatureFlagsProvider`](../src/state/feature-flags/index.tsx)). Settings > Privacy says so. Remove the flags after rollout so backup no longer depends on consent

### Phone backup

- Off on purpose. One cloud copy is enough
- iOS: AsyncStorage excludes its folder from iPhone backups by default (Info.plist `RCTAsyncStorageExcludeFromBackup` unset)
- Android: `allowBackup: false` in [`app.json`](../app.json)

## One-time setup

### Apple (iCloud)

- The `react-native-cloud-storage` config plugin adds the container `iCloud.<bundle id>` for each app variant
- Run the first `eas build --local` per variant with Apple login. EAS capability sync then registers the container and adds it to the profile. The App Store Connect API cannot do this ([EAS iOS capabilities](https://docs.expo.dev/build-reference/ios-capabilities/))
- Simulators without an Apple Account show "Turn on iCloud Drive in the Settings app to back up Pixy."

State (2026-10-06):

- `iCloud.com.devmood.pixymoodtracker` registered and in App Store profile `YLU4PAZU4P`. CI builds with `--freeze-credentials`, so sync capability changes locally first
- `iCloud.com.devmood.pixymoodtracker.preview` in the preview ad hoc profile

### Google Drive

- Google Cloud project: enable the Google Drive API
- OAuth consent screen with scope `https://www.googleapis.com/auth/drive.appdata`. It is non-sensitive: basic verification only
- One Android OAuth client per package (`com.devmood.pixymoodtracker`, `.preview`, `.dev`) with the SHA-1 of each signing key: Play app signing, upload key, local debug key
- One iOS OAuth client per bundle id (`com.devmood.pixymoodtracker`, `.preview`, `.dev`). Put its client id in `GOOGLE_IOS_CLIENT_IDS` in [`app.config.ts`](../app.config.ts). The id adds the `@react-native-google-signin/google-signin` config plugin (URL scheme) and reaches the app as `extra.googleIosClientId`. Needs a new native build
- No iOS client for a variant: the Backup screen offers no Google Drive on iOS, even with `backup-ios-google-drive` on. Without the client, sign-in crashes
- Missing client: sign-in fails with `DEVELOPER_ERROR`
- Consent status Testing: Google shows "Google hasn't verified this app", only test users can sign in, and sign-ins expire after 7 days. Keep the consent screen published
- Access revoked in the Google account, or account removed from the phone: `SIGN_IN_REQUIRED`, shown as "sign-in expired" with a Sign In link
- Drive rejects a revoked token with `ERR_AUTHENTICATION_FAILED` while Play services still hands out the cached one. Pixy clears the cached token and shows the same Sign In link (`backup_signed_out`, no Sentry report)

State (2026-10-06), Google Cloud project `pixy-mood-tracker` (4218331782):

- Drive API on
- Consent screen: app name Pixy Mood Tracker, audience External, status In production, brand verified. Scope `drive.appdata` (non-sensitive, no scope review). Support and developer contact `team@pixy.day`. Authorized domain `pixy.day`. Branding changes trigger brand verification again
- `team@pixy.day` is project Owner, so Pixy access does not depend on a private account
- Android OAuth clients:

| Client | Package | SHA-1 | Client ID |
| --- | --- | --- | --- |
| Pixy Preview (Android) | `com.devmood.pixymoodtracker.preview` | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (local debug keystore) | `4218331782-t8qte9joje3fpj4vp9ej7ii727n397v4.apps.googleusercontent.com` |
| Pixy (Android, Play) | `com.devmood.pixymoodtracker` | `F7:CD:85:34:FB:39:D3:24:7A:CD:E6:AF:DA:9C:0A:6B:72:BD:62:83` (Play app signing) | `4218331782-u1dkrhi2lf7pbiecul367atepqrhn9f6.apps.googleusercontent.com` |

- iOS OAuth clients: none yet. Create them for `.preview` and `com.devmood.pixymoodtracker` before turning on `backup-ios-google-drive`
- Missing: `com.devmood.pixymoodtracker` with upload key `76:7F:4F:D6:E3:95:3C:A6:30:06:21:F4:26:FD:F4:62:4E:CE:75:DA` (only for builds installed outside Play), `.dev` client

### Fake cloud (development and preview builds)

- Open `<scheme>://dev/fake-cloud`. It swaps iCloud and Google Drive for one file in the app's documents folder until the app restarts, and turns the switch off
- Turn the switch on to back up. The file survives "Delete all my data", so restore works end to end
- Code: [`src/dev/fake-backup-cloud.ts`](../src/dev/fake-backup-cloud.ts)

## Privacy notes

- Mood, emotions, and notes are health data (GDPR Article 9)
- Apple can read the iCloud file unless the user turns on Advanced Data Protection. Google can read the Drive file. Privacy bullets on the Backup screen say so
- Privacy policy: section "Optional cloud backup" at [pixy.day/privacy](https://pixy.day/privacy)
- App Store privacy label: no change. Apple counts data as collected only when the developer or its partners can access it ([App privacy details](https://developer.apple.com/app-store/app-privacy-details/)). Pixy cannot read the user's private iCloud container
- Google Play Data safety form: no change. Google exempts user-initiated backups to the user's own cloud account that the developer never accesses ([Data safety](https://support.google.com/googleplay/android-developer/answer/10787469))
- Recheck both if backup ever goes through a Pixy server or a shared container
- Account takeover = backup takeover. Pixy has no app lock

## Export files

- Exports are written to the cache folder, not the documents folder ([`src/features/datagate/export-file.ts`](../src/features/datagate/export-file.ts))
- iOS deletes the file when the share sheet closes. Android keeps it until the next export, because receiving apps may read it later
- Each export deletes leftover export files from the documents folder. Versions up to 1.88.0 never removed them

## Later

- Encrypt the backup file with a key in iCloud Keychain, so Apple and Google cannot read it
- Restore offer during onboarding when a backup exists
- Multi-device sync: not planned until the paid perk list in [`vision.md`](../vision.md) is locked
