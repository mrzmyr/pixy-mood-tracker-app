# Backup

Pixy has no server. Data leaves the phone only through the cloud backup or a manual export.

## Cloud backup

- Behind PostHog feature flag `backup`. Flag off: no Settings > Data > Backup row, Backup deep link redirects to Settings > Data, no cloud read or write even when `backupEnabled` is on
- One file `pixy-mood-tracker-backup.json` in the hidden app folder of iCloud (iOS) or Google Drive (Android)
- Library: [`react-native-cloud-storage`](https://cloudstorage.kuatsu.de/), `AppData` scope
- Code: [`src/features/backup/`](../src/features/backup/)
- Screen: Settings > Data > Backup ([`src/features/settings/screens/Backup.tsx`](../src/features/settings/screens/Backup.tsx))
- File = normal export ([`buildExportData`](../src/features/datagate/DataGate.ts)) plus `deviceId` and `createdAt`. "Last sync" shows `createdAt`
- Writes 3 seconds after the last change of entries, tags, people, or exported settings
- Restore uses the import flow. It replaces local data after a confirmation
- "Restore from Backup…" shows only while auto-backup is paused: no local entries, or a bigger backup from another phone. Restore can never discard newer local changes

### Rules

- Never write a backup with 0 entries
- Never write before the logs store loaded. Before that the entry count is 0 and "Restore" would show for a moment
- Never replace a cloud file this version cannot parse (newer `pixyBackup`, unknown export field, damaged JSON). Status `incompatible`, backup pauses until the app updates
- Restore waits for the import to finish before this phone claims the backup. Until then the next write would replace the backup with the old local data
- Offline failures (`backup_offline` in [`cloud.ts`](../src/features/backup/cloud.ts)) pause backup with status `unavailable`. Other failures reach Sentry once per failure code and session
- Replace another phone's backup only when this phone has at least as many entries ([`canReplaceBackup`](../src/features/backup/backupFile.ts)). A fresh install must not wipe the backup before the user restores
- Switch off deletes the cloud file after a confirmation. On Android it also signs out of Google
- `settings.backupEnabled` is a device setting: not exported, kept on import. Default on for iOS, off for Android (needs Google sign-in)

### Phone backup

- Off on purpose. One cloud copy is enough
- iOS: AsyncStorage excludes its folder from iPhone backups by default (Info.plist `RCTAsyncStorageExcludeFromBackup` unset)
- Android: `allowBackup: false` in [`app.json`](../app.json)

## One-time setup

### Apple (iCloud)

- The `react-native-cloud-storage` config plugin adds the container `iCloud.<bundle id>` for each app variant
- Run the first `eas build --local` per variant with Apple login. EAS capability sync then registers the container and adds it to the profile. The App Store Connect API cannot do this ([EAS iOS capabilities](https://docs.expo.dev/build-reference/ios-capabilities/))
- Simulators without an Apple Account show "Turn on iCloud Drive in the Settings app to back up Pixy."

### Google (Drive, Android)

- Google Cloud project: enable the Google Drive API
- OAuth consent screen with scope `https://www.googleapis.com/auth/drive.appdata`. It is non-sensitive: basic verification only
- One Android OAuth client per package (`com.devmood.pixymoodtracker`, `.preview`, `.dev`) with the SHA-1 of each signing key: Play app signing, upload key, local debug key
- Missing client: sign-in fails with `DEVELOPER_ERROR`
- Access revoked in the Google account, or account removed from the phone: `SIGN_IN_REQUIRED`, shown as "sign-in expired" with a Sign In link
- No `@react-native-google-signin/google-signin` config plugin: it needs an iOS client, and iOS uses iCloud

### Fake cloud (development and preview builds)

- Open `<scheme>://dev/fake-cloud`. It swaps iCloud and Google Drive for one file in the app's documents folder until the app restarts, and turns the switch off
- Turn the switch on to back up. The file survives "Delete all my data", so restore works end to end
- Code: [`src/dev/fakeBackupCloud.ts`](../src/dev/fakeBackupCloud.ts)

## Privacy notes

- Mood, emotions, and notes are health data (GDPR Article 9)
- Apple can read the iCloud file unless the user turns on Advanced Data Protection. Google can read the Drive file. Privacy bullets on the Backup screen say so
- Data in the user's own cloud that Pixy cannot read is not collection by Pixy. Still disclose it in the privacy policy at pixy.day/privacy, the App Store privacy label, and the Google Play Data safety form
- Account takeover = backup takeover. Pixy has no app lock

## Export files

- Exports are written to the cache folder, not the documents folder ([`src/features/datagate/exportFile.ts`](../src/features/datagate/exportFile.ts))
- iOS deletes the file when the share sheet closes. Android keeps it until the next export, because receiving apps may read it later
- Each export deletes leftover export files from the documents folder. Versions up to 1.88.0 never removed them

## Later

- Encrypt the backup file with a key in iCloud Keychain, so Apple and Google cannot read it
- Restore offer during onboarding when a backup exists
- Multi-device sync: not planned until the paid perk list in [`vision.md`](../vision.md) is locked
